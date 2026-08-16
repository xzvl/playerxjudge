// The real data layer behind the player dashboard's match-based pages
// (Dashboard, Registered Tournaments, Match History, Achievements,
// Statistics) — built on `participant_links`
// (supabase/migrations/20250101000036_participant_links.sql), the
// self-serve, organizer-confirmed connection between a real account and a
// `tournament_participants` roster entry. Only `status = 'approved'` links
// count as "this is genuinely me" — a pending request isn't confirmed yet.
import type { createClient } from "@/lib/supabase/server";
import type { BattleType, BracketFormat, FinishType, TournamentType } from "@/lib/types/database";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface LinkedTournament {
  tournamentId: string;
  participantId: string;
  // team_name ?? name — how this participant is identified on the roster,
  // used to match against `tournaments.champion_name` (see
  // computeAchievements) since there's no `champion_participant_id` column,
  // only a free-text name snapshotted at completion time (see
  // endTournament in matches-actions.ts).
  participantName: string;
  championName: string | null;
  tournamentType: TournamentType;
  bracketFormat: BracketFormat;
  battleType: BattleType;
  linkedAt: string;
}

interface LinkedTournamentRow {
  participant_id: string;
  tournament_id: string;
  decided_at: string | null;
  requested_at: string;
  tournament_participants: { name: string; team_name: string | null } | null;
  tournaments: {
    champion_name: string | null;
    tournament_type: TournamentType;
    bracket_format: BracketFormat;
    battle_type: BattleType;
  } | null;
}

export async function fetchLinkedTournaments(supabase: SupabaseClient, profileId: string): Promise<LinkedTournament[]> {
  const { data } = await supabase
    .from("participant_links")
    .select(
      "participant_id, tournament_id, decided_at, requested_at, tournament_participants(name, team_name), tournaments(champion_name, tournament_type, bracket_format, battle_type)"
    )
    .eq("profile_id", profileId)
    .eq("status", "approved");

  return ((data as unknown as LinkedTournamentRow[] | null) ?? []).map((r) => ({
    tournamentId: r.tournament_id,
    participantId: r.participant_id,
    participantName: r.tournament_participants?.team_name ?? r.tournament_participants?.name ?? "",
    championName: r.tournaments?.champion_name ?? null,
    tournamentType: r.tournaments?.tournament_type ?? "casual",
    bracketFormat: r.tournaments?.bracket_format ?? "single_elimination",
    battleType: r.tournaments?.battle_type ?? "solo",
    linkedAt: r.decided_at ?? r.requested_at,
  }));
}

export interface PlayerMatch {
  id: string;
  tournamentId: string;
  tournamentTitle: string;
  battleType: BattleType;
  opponent: string;
  result: "won" | "lost" | "draw";
  round: number;
  stage: string;
  // The last recorded battle's finish type — the one that decided the
  // match — for the Match History table's Finish column. null when the
  // result was entered by the organizer directly (score.battles is only
  // ever populated by the judge console, see submitJudgedMatchResult).
  finishType: FinishType | null;
  // Every individual battle this player personally won within the match
  // (a Best-of-X match can hand out several finishes), used for the
  // Statistics/Achievements finish-type tallies — see computePlayerStats.
  myBattleWins: FinishType[];
  playedAt: string | null;
}

interface RawMatchRow {
  id: string;
  tournament_id: string;
  round: number;
  group_id: string | null;
  bracket_id: string | null;
  participant_a_id: string | null;
  participant_b_id: string | null;
  winner_id: string | null;
  score: { a?: number; b?: number; battles?: { winnerId: string; finishType: FinishType }[] };
  completed_at: string | null;
  tournaments: { title: string; battle_type: BattleType } | null;
  tournament_groups: { label: string } | null;
}

const MATCH_COLUMNS =
  "id, tournament_id, round, group_id, bracket_id, participant_a_id, participant_b_id, winner_id, score, completed_at, tournaments(title, battle_type), tournament_groups(label)";

// Stage is simplified to three buckets — a group's own round-robin/Swiss
// schedule, a placement bracket (3rd Place Match, 5th-8th Place Bracket,
// ...), or the main final-stage bracket — same simplification as the judge
// Match History page (no single stored human label for placement
// brackets, see Bracket's `structure`).
function stageOf(m: RawMatchRow): string {
  if (m.group_id) return `Group ${m.tournament_groups?.label ?? "—"}`;
  if (m.bracket_id) return "Placement Bracket";
  return "Final Stage";
}

export async function fetchPlayerMatches(supabase: SupabaseClient, linked: LinkedTournament[]): Promise<PlayerMatch[]> {
  if (linked.length === 0) return [];
  const myParticipantIds = new Set(linked.map((l) => l.participantId));
  const idList = [...myParticipantIds];

  // Two queries rather than a single `.or()` — mirrors the judge Match
  // History page's own merge-by-id approach, since a match's two
  // participant slots are separate columns.
  const [{ data: asA }, { data: asB }] = await Promise.all([
    supabase.from("matches").select(MATCH_COLUMNS).in("participant_a_id", idList).eq("status", "completed"),
    supabase.from("matches").select(MATCH_COLUMNS).in("participant_b_id", idList).eq("status", "completed"),
  ]);

  const byId = new Map<string, RawMatchRow>();
  for (const m of [...((asA as unknown as RawMatchRow[] | null) ?? []), ...((asB as unknown as RawMatchRow[] | null) ?? [])]) {
    byId.set(m.id, m);
  }
  const rows = [...byId.values()];
  if (rows.length === 0) return [];

  // Opponent names — matches.participant_a_id/participant_b_id point at
  // tournament_participants (a free-typed roster, not `profiles`), so
  // names need a separate lookup rather than a join alias.
  const opponentIds = new Set<string>();
  for (const m of rows) {
    if (m.participant_a_id && !myParticipantIds.has(m.participant_a_id)) opponentIds.add(m.participant_a_id);
    if (m.participant_b_id && !myParticipantIds.has(m.participant_b_id)) opponentIds.add(m.participant_b_id);
  }
  const nameById = new Map<string, string>();
  if (opponentIds.size > 0) {
    const { data: participants } = await supabase
      .from("tournament_participants")
      .select("id, name, team_name")
      .in("id", [...opponentIds]);
    for (const p of (participants as { id: string; name: string; team_name: string | null }[] | null) ?? []) {
      nameById.set(p.id, p.team_name ?? p.name);
    }
  }

  return rows
    .map((m): PlayerMatch => {
      const myId = [m.participant_a_id, m.participant_b_id].find((id) => id && myParticipantIds.has(id)) ?? null;
      const opponentId = [m.participant_a_id, m.participant_b_id].find((id) => id && id !== myId) ?? null;
      const battles = m.score.battles ?? [];

      return {
        id: m.id,
        tournamentId: m.tournament_id,
        tournamentTitle: m.tournaments?.title ?? "Unknown Tournament",
        battleType: m.tournaments?.battle_type ?? "solo",
        opponent: opponentId ? (nameById.get(opponentId) ?? "Unknown") : "Bye",
        result: !m.winner_id ? "draw" : m.winner_id === myId ? "won" : "lost",
        round: m.round,
        stage: stageOf(m),
        finishType: battles.length > 0 ? battles[battles.length - 1].finishType : null,
        myBattleWins: battles.filter((b) => b.winnerId === myId).map((b) => b.finishType),
        playedAt: m.completed_at,
      };
    })
    .sort((a, b) => new Date(b.playedAt ?? 0).getTime() - new Date(a.playedAt ?? 0).getTime());
}
