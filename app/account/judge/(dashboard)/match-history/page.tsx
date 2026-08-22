import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { JudgeMatchHistoryPanel, type JudgeMatchRow } from "@/components/dashboard/judge/JudgeMatchHistoryPanel";
import { getCurrentProfile, getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import type { MatchScore } from "@/lib/types/database";

export const metadata: Metadata = { title: "Match History", robots: { index: false, follow: false } };

interface RawMatchRow {
  id: string;
  tournament_id: string;
  round: number;
  match_number: number;
  group_id: string | null;
  bracket_id: string | null;
  score: MatchScore;
  winner_id: string | null;
  participant_a_id: string | null;
  participant_b_id: string | null;
  completed_at: string | null;
  tournaments: { title: string } | null;
  tournament_groups: { label: string } | null;
}

const MATCH_COLUMNS =
  "id, tournament_id, round, match_number, group_id, bracket_id, score, winner_id, participant_a_id, participant_b_id, completed_at, tournaments(title), tournament_groups(label)";

export default async function JudgeMatchHistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/judge/match-history");

  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const { data: organizerTournaments } = await supabase.from("tournaments").select("id").eq("organizer_id", user.id);
  const organizerTournamentIds = (organizerTournaments as { id: string }[] | null)?.map((t) => t.id) ?? [];

  // `matches.judge_id` is never actually written by the app (the judge
  // console only stamps score.judgeUsername/judgeName on submit — see
  // submitJudgedMatchResult in matches-actions.ts), so filtering on it here
  // always came back empty. score->>judgeUsername is the real, non-spoofable
  // record of who personally judged a match (captured server-side from the
  // judge's own session at submit time — see JudgeConsole/judge/page.tsx),
  // so that's what identifies "matches I judged" instead.
  const [{ data: judgedMatches }, { data: organizedMatches }] = await Promise.all([
    profile?.username
      ? supabase
          .from("matches")
          .select(MATCH_COLUMNS)
          .eq("score->>judgeUsername", profile.username)
          .eq("score->>inputBy", "judge")
          .eq("status", "completed")
      : Promise.resolve({ data: [] as RawMatchRow[] }),
    organizerTournamentIds.length > 0
      ? supabase
          .from("matches")
          .select(MATCH_COLUMNS)
          .in("tournament_id", organizerTournamentIds)
          .eq("status", "completed")
          .eq("score->>inputBy", "organizer")
      : Promise.resolve({ data: [] as RawMatchRow[] }),
  ]);

  // A judge who's also the organizer of the same tournament could show up
  // in both queries above (e.g. they judged some matches and personally
  // reported others) — dedupe by id rather than assume the two sets are
  // disjoint.
  const byId = new Map<string, RawMatchRow>();
  for (const m of [...((judgedMatches as unknown as RawMatchRow[] | null) ?? []), ...((organizedMatches as unknown as RawMatchRow[] | null) ?? [])]) {
    byId.set(m.id, m);
  }
  const matches = [...byId.values()];

  // `matches.participant_a_id`/`participant_b_id` point at
  // `tournament_participants` (a free-typed roster, not `profiles` — see
  // 20250101000013_group_stage_matches.sql), so names need a separate
  // lookup rather than a join alias.
  const participantIds = [...new Set(matches.flatMap((m) => [m.participant_a_id, m.participant_b_id, m.winner_id]).filter((id): id is string => !!id))];
  const participantNames = new Map<string, string>();
  if (participantIds.length > 0) {
    const { data: participants } = await supabase.from("tournament_participants").select("id, name, team_name").in("id", participantIds);
    for (const p of (participants as { id: string; name: string; team_name: string | null }[] | null) ?? []) {
      participantNames.set(p.id, p.team_name ?? p.name);
    }
  }

  function nameOf(id: string | null): string {
    return (id && participantNames.get(id)) || "—";
  }

  // Stage is simplified to three buckets — a group's own round-robin/Swiss
  // schedule, a placement bracket (3rd Place Match, 5th-8th Place Bracket,
  // etc. — no single stored human label to read back, see Bracket's
  // `structure`), or the main final-stage bracket.
  function stageOf(m: RawMatchRow): string {
    if (m.group_id) return `Group ${m.tournament_groups?.label ?? "—"}`;
    if (m.bracket_id) return "Placement Bracket";
    return "Final Stage";
  }

  const rows: JudgeMatchRow[] = matches.map((m) => ({
    id: m.id,
    tournamentId: m.tournament_id,
    tournamentTitle: m.tournaments?.title ?? "Unknown Tournament",
    stage: stageOf(m),
    round: m.round,
    playerAName: nameOf(m.participant_a_id),
    playerBName: nameOf(m.participant_b_id),
    result: typeof m.score.a === "number" && typeof m.score.b === "number" ? `${m.score.a} – ${m.score.b}` : "—",
    winnerName: m.winner_id ? nameOf(m.winner_id) : "Draw",
    reportedAt: m.completed_at,
  }));

  const tournaments = [...new Map(rows.map((r) => [r.tournamentId, r.tournamentTitle])).entries()].map(([id, title]) => ({ id, title }));

  return (
    <div>
      <p className="label-mono text-primary">Judge Dashboard</p>
      <h1 className="heading mt-2 text-3xl">Match History</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Every match you&apos;ve judged or reported as organizer.</p>
      <div className="mt-8">
        <JudgeMatchHistoryPanel tournaments={tournaments} rows={rows} />
      </div>
    </div>
  );
}
