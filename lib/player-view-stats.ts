// Per-participant stat helpers for /tournaments/[slug]/player — the
// spectator-facing "look up a blader's stats" view. Everything here reads
// straight off real `matches` rows (group stage + final stage together);
// see lib/swiss.ts for the group-standings computation this complements.

import type { FinishType, Match, MatchScore } from "@/lib/types/database";

export type FinishCounts = Record<FinishType, number>;

function isScore(value: Match["score"]): value is MatchScore {
  return typeof value === "object" && value !== null && "a" in value && "b" in value;
}

export function emptyFinishCounts(): FinishCounts {
  return { burst: 0, spin: 0, extreme: 0, over: 0 };
}

// Tallies every battle a participant WON, by finish type, across whichever
// matches are passed in — pass just one match for a single match card, or
// every match they've played for their tournament-wide totals.
export function computeFinishCounts(participantId: string, matches: Match[]): FinishCounts {
  const counts = emptyFinishCounts();
  for (const m of matches) {
    if (!isScore(m.score) || !m.score.battles) continue;
    for (const battle of m.score.battles) {
      if (battle.winnerId === participantId) counts[battle.finishType] += 1;
    }
  }
  return counts;
}

export function totalFinishes(counts: FinishCounts): number {
  return counts.burst + counts.spin + counts.extreme + counts.over;
}

// Ranked descending by count, ties broken by a fixed display order — used
// for the "# Spin Finishes / # Extreme Finishes" tags on match cards.
const FINISH_DISPLAY_ORDER: FinishType[] = ["spin", "burst", "extreme", "over"];
export function rankedFinishes(counts: FinishCounts): { type: FinishType; count: number }[] {
  return FINISH_DISPLAY_ORDER.map((type) => ({ type, count: counts[type] }))
    .filter((f) => f.count > 0)
    .sort((a, b) => b.count - a.count);
}

export const FINISH_LABEL: Record<FinishType, string> = {
  burst: "Burst",
  spin: "Spin",
  extreme: "Extreme",
  over: "Over",
};

// Every match (group or final stage) a participant is seated in.
export function participantMatches(participantId: string, matches: Match[]): Match[] {
  return matches.filter((m) => m.participant_a_id === participantId || m.participant_b_id === participantId);
}

export function opponentIdFor(participantId: string, match: Match): string | null {
  if (match.participant_a_id === participantId) return match.participant_b_id;
  if (match.participant_b_id === participantId) return match.participant_a_id;
  return null;
}

export function scoreFor(participantId: string, match: Match): { mine: number; theirs: number } | null {
  if (!isScore(match.score)) return null;
  return match.participant_a_id === participantId
    ? { mine: match.score.a, theirs: match.score.b }
    : { mine: match.score.b, theirs: match.score.a };
}

export interface SideRecord {
  wins: number;
  played: number;
}

// "X Side" / "B Side" are this app's names for the two match seats
// (participant_a_id / participant_b_id — same convention the judge
// console's header uses: Player 1 defaults to X Side, Player 2 to B Side).
// Win rate per side only counts decisively-completed matches (a tie has no
// winner_id, so it's excluded from both `wins` and `played` rather than
// counting as a loss).
export function sideRecords(participantId: string, matches: Match[]): { xSide: SideRecord; bSide: SideRecord } {
  const xSide: SideRecord = { wins: 0, played: 0 };
  const bSide: SideRecord = { wins: 0, played: 0 };
  for (const m of matches) {
    if (m.status !== "completed" || !m.winner_id) continue;
    if (m.participant_a_id === participantId) {
      xSide.played += 1;
      if (m.winner_id === participantId) xSide.wins += 1;
    } else if (m.participant_b_id === participantId) {
      bSide.played += 1;
      if (m.winner_id === participantId) bSide.wins += 1;
    }
  }
  return { xSide, bSide };
}
