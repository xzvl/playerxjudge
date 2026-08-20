// Tournament-wide "who's landing the most X" leaderboards behind
// /account/organizer/tournament/[slug]/top-finishers — same underlying data
// (score.battles, score.penaltiesA/B) as lib/player-view-stats.ts's
// computeFinishCounts/sideRecords, just tallied for the whole roster in one
// pass instead of one participant at a time.
import type { FinishType, Match, MatchScore, TournamentParticipant } from "@/lib/types/database";

export interface FinisherEntry {
  participantId: string;
  name: string;
  teamName: string | null;
  count: number;
}

function isScore(value: Match["score"]): value is MatchScore {
  return typeof value === "object" && value !== null && "a" in value && "b" in value;
}

const TOP_N = 5;

// Ties on the finish/penalty count fall through to each participant's
// tournament-wide standing — same cascade Standings itself sorts by (W-L-T,
// score, tie break #1/#2/#3, TB), see computeGroupStandings in lib/swiss.ts.
// `standingsRank` is just that function's own sorted output turned into a
// participantId -> index map (lower index = better standing) by the caller,
// so this file doesn't need to know or re-implement any of those metrics
// itself. Seed is the final fallback, for anyone the standings computation
// didn't rank (e.g. no matches played at all yet).
function topEntries(
  counts: Map<string, number>,
  participants: TournamentParticipant[],
  standingsRank: Map<string, number>
): FinisherEntry[] {
  const byId = new Map(participants.map((p) => [p.id, p]));
  const rankOf = (id: string) => standingsRank.get(id) ?? Number.MAX_SAFE_INTEGER;
  return [...counts.entries()]
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1] || rankOf(a[0]) - rankOf(b[0]) || (byId.get(a[0])?.seed ?? 0) - (byId.get(b[0])?.seed ?? 0))
    .slice(0, TOP_N)
    .map(([participantId, count]) => {
      const p = byId.get(participantId);
      return { participantId, name: p?.name ?? "Unknown", teamName: p?.team_name ?? null, count };
    });
}

// Every battle win, tallied per participant per finish type, across every
// match passed in (pass both group-stage and final-stage matches together
// for a tournament-wide leaderboard).
export function computeFinisherLeaderboards(
  participants: TournamentParticipant[],
  matches: Match[],
  standingsRank: Map<string, number>
): Record<FinishType, FinisherEntry[]> {
  const counts: Record<FinishType, Map<string, number>> = {
    burst: new Map(),
    spin: new Map(),
    extreme: new Map(),
    over: new Map(),
  };
  for (const m of matches) {
    if (!isScore(m.score) || !m.score.battles) continue;
    for (const battle of m.score.battles) {
      const map = counts[battle.finishType];
      map.set(battle.winnerId, (map.get(battle.winnerId) ?? 0) + 1);
    }
  }

  return {
    burst: topEntries(counts.burst, participants, standingsRank),
    spin: topEntries(counts.spin, participants, standingsRank),
    extreme: topEntries(counts.extreme, participants, standingsRank),
    over: topEntries(counts.over, participants, standingsRank),
  };
}

// Total points *gained from* penalties — not who committed the foul. A
// penalty against one side hands a point to the other (see MatchScore's doc
// comment: "each one already added a point to the other side's a/b total"),
// so penaltiesA (committed by A) credits participant_b_id, and penaltiesB
// credits participant_a_id — same "got points from the penalty" framing as
// PlayerMatch.opponentPenalties (lib/player/linked-participants.ts) backing
// the "Thanks to Penalty" achievement.
export function computePenaltyLeaderboard(
  participants: TournamentParticipant[],
  matches: Match[],
  standingsRank: Map<string, number>
): FinisherEntry[] {
  const counts = new Map<string, number>();
  for (const m of matches) {
    if (!isScore(m.score)) continue;
    if (m.participant_b_id && m.score.penaltiesA) {
      counts.set(m.participant_b_id, (counts.get(m.participant_b_id) ?? 0) + m.score.penaltiesA);
    }
    if (m.participant_a_id && m.score.penaltiesB) {
      counts.set(m.participant_a_id, (counts.get(m.participant_a_id) ?? 0) + m.score.penaltiesB);
    }
  }
  return topEntries(counts, participants, standingsRank);
}
