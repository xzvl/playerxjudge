// Swiss-system pairing and standings for the group stage.
//
// This is a pragmatic, greedy implementation, not a tournament-grade Swiss
// engine: rematch avoidance is a simple "first fresh opponent found" scan
// (not a full min-conflict matching). The Buchholz tie-break is the
// Median-Buchholz variant (matches Challonge's definition): sum of a
// participant's opponents' current scores, with the single best and single
// worst opponent score discarded first — which is why it reads 0 for
// everyone until a 3rd opponent's score exists to survive the discard.
// Good enough for a single group of a few dozen players; revisit if
// larger/competitive events need exact USCF-style rules.

import type { Match, MatchScore, TournamentParticipant } from "@/lib/types/database";
import type { SwissPoints, TieBreakMetric } from "@/lib/validations/tournament-wizard";

export interface SwissPairing {
  matchNumber: number;
  participantAId: string;
  participantBId: string | null; // null = bye
}

function isScore(value: Match["score"]): value is MatchScore {
  return typeof value === "object" && value !== null && "a" in value && "b" in value;
}

// Round 1: split the seeded field into a top half and bottom half, pair
// straight across (1 vs n/2+1, 2 vs n/2+2, ...) — the standard initial
// Swiss seeding used by Challonge and most pairing software.
export function generateInitialPairings(participants: { id: string; seed: number }[]): SwissPairing[] {
  const sorted = [...participants].sort((a, b) => a.seed - b.seed);
  let pool = sorted;
  let byeParticipant: { id: string; seed: number } | null = null;

  if (pool.length % 2 === 1) {
    byeParticipant = pool[pool.length - 1];
    pool = pool.slice(0, -1);
  }

  const half = pool.length / 2;
  const top = pool.slice(0, half);
  const bottom = pool.slice(half);

  const pairings: SwissPairing[] = top.map((a, i) => ({
    matchNumber: i + 1,
    participantAId: a.id,
    participantBId: bottom[i].id,
  }));

  if (byeParticipant) {
    pairings.push({ matchNumber: pairings.length + 1, participantAId: byeParticipant.id, participantBId: null });
  }

  return pairings;
}

interface MatchResult {
  round: number;
  opponentId: string | null;
  result: "W" | "L" | "T" | "BYE";
}

interface RawRecord {
  id: string;
  seed: number;
  wins: number;
  losses: number;
  ties: number;
  byes: number;
  gameWins: number;
  gameLosses: number;
  score: number;
  results: MatchResult[];
}

function buildRawRecords(
  participants: { id: string; seed: number }[],
  matches: Match[],
  points: SwissPoints
): Map<string, RawRecord> {
  const records = new Map<string, RawRecord>();
  for (const p of participants) {
    records.set(p.id, { id: p.id, seed: p.seed, wins: 0, losses: 0, ties: 0, byes: 0, gameWins: 0, gameLosses: 0, score: 0, results: [] });
  }

  const completed = [...matches]
    .filter((m) => m.status === "completed")
    .sort((a, b) => a.round - b.round || a.match_number - b.match_number);

  for (const m of completed) {
    const a = m.participant_a_id ? records.get(m.participant_a_id) : undefined;

    if (m.participant_b_id === null) {
      if (a) {
        a.wins += 1;
        a.byes += 1;
        a.score += points.pointsPerBye;
        a.results.push({ round: m.round, opponentId: null, result: "BYE" });
      }
      continue;
    }

    const b = records.get(m.participant_b_id);
    if (!a || !b) continue;

    const score = isScore(m.score) ? m.score : { a: 0, b: 0 };
    a.gameWins += score.a;
    a.gameLosses += score.b;
    b.gameWins += score.b;
    b.gameLosses += score.a;

    if (m.winner_id === a.id) {
      a.wins += 1;
      b.losses += 1;
      a.score += points.pointsPerMatchWin;
      a.results.push({ round: m.round, opponentId: b.id, result: "W" });
      b.results.push({ round: m.round, opponentId: a.id, result: "L" });
    } else if (m.winner_id === b.id) {
      b.wins += 1;
      a.losses += 1;
      b.score += points.pointsPerMatchWin;
      b.results.push({ round: m.round, opponentId: a.id, result: "W" });
      a.results.push({ round: m.round, opponentId: b.id, result: "L" });
    } else {
      a.ties += 1;
      b.ties += 1;
      a.score += points.pointsPerMatchTie;
      b.score += points.pointsPerMatchTie;
      a.results.push({ round: m.round, opponentId: b.id, result: "T" });
      b.results.push({ round: m.round, opponentId: a.id, result: "T" });
    }
  }

  return records;
}

// "Wins against tied opponents" — the dedicated TB column: how many of a
// participant's wins were against an opponent who is *fully* tied with them
// right now, meaning score AND all 3 configured tie-break metrics match —
// not just raw score. Two participants sharing a score but differing on,
// say, Pts Diff are not "tied" for this purpose (verified against real
// production standings: several same-score wins read TB=1 here but 0 on
// Challonge, and in every case the opponent's Pts Diff already differed).
function computeWinsVsTied(
  records: Map<string, RawRecord>,
  tieBreakMetrics: [TieBreakMetric, TieBreakMetric, TieBreakMetric],
  buchholz: Map<string, number>
): Map<string, number> {
  // Placeholder — only consulted if "wins_vs_tied" is itself one of the
  // three configured tie-break metrics, which would be self-referential;
  // that dimension just reads 0 in that rare case rather than looping.
  const noWinsVsTiedYet = new Map<string, number>();
  const standingTuple = (r: RawRecord): [number, number, number] => [
    metricValue(tieBreakMetrics[0], r, noWinsVsTiedYet, buchholz),
    metricValue(tieBreakMetrics[1], r, noWinsVsTiedYet, buchholz),
    metricValue(tieBreakMetrics[2], r, noWinsVsTiedYet, buchholz),
  ];
  const isFullyTied = (a: RawRecord, b: RawRecord) => {
    if (a.score !== b.score) return false;
    const ta = standingTuple(a);
    const tb = standingTuple(b);
    return ta[0] === tb[0] && ta[1] === tb[1] && ta[2] === tb[2];
  };

  const out = new Map<string, number>();
  for (const r of records.values()) {
    let count = 0;
    for (const res of r.results) {
      if (res.result === "W" && res.opponentId) {
        const opponent = records.get(res.opponentId);
        if (opponent && isFullyTied(r, opponent)) count++;
      }
    }
    out.set(r.id, count);
  }
  return out;
}

// Median-Buchholz: sum of opponents' current scores, with the single best
// and single worst discarded first (see file header). Byes have no
// opponentId and don't enter the list at all — they neither count toward
// nor get discarded from it.
function computeBuchholz(records: Map<string, RawRecord>): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of records.values()) {
    const opponentScores = r.results
      .filter((res) => res.opponentId !== null)
      .map((res) => records.get(res.opponentId!)?.score ?? 0)
      .sort((a, b) => a - b);
    const median = opponentScores.slice(1, -1);
    out.set(
      r.id,
      median.reduce((sum, s) => sum + s, 0)
    );
  }
  return out;
}

function metricValue(
  metric: TieBreakMetric,
  r: RawRecord,
  winsVsTied: Map<string, number>,
  buchholz: Map<string, number>
): number {
  switch (metric) {
    case "match_wins":
      return r.wins;
    case "game_wins":
      return r.gameWins;
    case "game_win_pct":
      return r.gameWins + r.gameLosses > 0 ? r.gameWins / (r.gameWins + r.gameLosses) : 0;
    case "game_diff":
      return r.gameWins - r.gameLosses;
    case "points_scored":
      return r.gameWins;
    case "points_diff":
      return r.gameWins - r.gameLosses;
    case "wins_vs_tied":
      return winsVsTied.get(r.id) ?? 0;
    case "median_buchholz":
      return buchholz.get(r.id) ?? 0;
    default:
      return 0;
  }
}

export interface StandingsRow {
  participantId: string;
  seed: number;
  name: string;
  teamName: string | null;
  wins: number;
  losses: number;
  ties: number;
  score: number;
  tieBreak1: number;
  tieBreak2: number;
  tieBreak3: number;
  winsVsTied: number;
  matchHistory: MatchResult[];
}

export function computeGroupStandings(
  participants: TournamentParticipant[],
  matches: Match[],
  swissPoints: SwissPoints,
  tieBreakMetrics: [TieBreakMetric, TieBreakMetric, TieBreakMetric]
): StandingsRow[] {
  const records = buildRawRecords(
    participants.map((p) => ({ id: p.id, seed: p.seed })),
    matches,
    swissPoints
  );
  const buchholz = computeBuchholz(records);
  const winsVsTied = computeWinsVsTied(records, tieBreakMetrics, buchholz);

  const rows: StandingsRow[] = participants.map((p) => {
    const r = records.get(p.id)!;
    return {
      participantId: p.id,
      seed: p.seed,
      name: p.name,
      teamName: p.team_name,
      wins: r.wins,
      losses: r.losses,
      ties: r.ties,
      score: r.score,
      tieBreak1: metricValue(tieBreakMetrics[0], r, winsVsTied, buchholz),
      tieBreak2: metricValue(tieBreakMetrics[1], r, winsVsTied, buchholz),
      tieBreak3: metricValue(tieBreakMetrics[2], r, winsVsTied, buchholz),
      winsVsTied: winsVsTied.get(p.id) ?? 0,
      matchHistory: r.results,
    };
  });

  // TB (wins against fully-tied opponents) is always the tiebreaker right
  // after the 3 configured metrics, even though it isn't itself one of the
  // 3 configurable slots — two participants tied through tieBreak3 don't
  // fall straight to seed if one of them has a win the other doesn't.
  rows.sort(
    (a, b) =>
      b.score - a.score ||
      b.tieBreak1 - a.tieBreak1 ||
      b.tieBreak2 - a.tieBreak2 ||
      b.tieBreak3 - a.tieBreak3 ||
      b.winsVsTied - a.winsVsTied ||
      a.seed - b.seed
  );

  return rows;
}

// Round 2+: standard Swiss "fold" pairing, score-band by score-band, ranked
// within each band by the group's configured tie-break metrics #1/#2/#3
// (Pts Diff / Points / Buchholz, or whatever's configured) plus TB (wins vs
// fully-tied opponents), same order the standings table itself uses — full
// standings rank decides who floats and how each band folds, not seed.
//
// NOTE: this is a deliberate change back from a seed-only version of this
// function that was verified match-for-match against real Round 2/3
// production data and a manual Challonge replication — in that data, the
// participant who actually floated in one band ranked 9th of 11 by these
// same tie-break metrics (neither best nor worst), and only "highest
// original seed" predicted it correctly. Tie-break-based pairing was
// requested anyway; expect pairings to diverge from Challonge's own output
// as a result — revisit lib/swiss.ts git history for the seed-based version
// if that divergence becomes a problem.
//
// 1. Group everyone into score bands (highest score first).
// 2. Within a band, rank by tie-break metrics #1/#2/#3 then TB then seed —
//    split into a top half (best-ranked) and bottom half (worst-ranked) and
//    pair straight across (top[i] vs bottom[i]).
// 3. Downfloat: when a band has an odd headcount, its worst-ranked member
//    moves down and *immediately* cross-pairs against the next band's own
//    best-ranked member (consuming one seat from that band). That band's
//    own remaining seat count is then checked independently: if still odd,
//    *its* worst-ranked member floats down the same way, and so on.
// 4. Rematch avoidance within a band's own fold is a simple "first fresh
//    opponent" scan (falls back to a forced rematch only if every remaining
//    bottom-half candidate has already been played).
// 5. If the lowest band is still odd after every band above has floated a
//    member down as far as it can, its worst-ranked member (who hasn't
//    already had a bye) sits this round out.
export function generateNextRoundPairings(
  participants: TournamentParticipant[],
  matches: Match[],
  swissPoints: SwissPoints,
  tieBreakMetrics: [TieBreakMetric, TieBreakMetric, TieBreakMetric]
): SwissPairing[] {
  const records = buildRawRecords(
    participants.map((p) => ({ id: p.id, seed: p.seed })),
    matches,
    swissPoints
  );
  const buchholz = computeBuchholz(records);
  const winsVsTied = computeWinsVsTied(records, tieBreakMetrics, buchholz);
  const tieBreakValues = (r: RawRecord): [number, number, number] => [
    metricValue(tieBreakMetrics[0], r, winsVsTied, buchholz),
    metricValue(tieBreakMetrics[1], r, winsVsTied, buchholz),
    metricValue(tieBreakMetrics[2], r, winsVsTied, buchholz),
  ];
  // Best-ranked first — mirrors computeGroupStandings' own sort exactly
  // (score, tieBreak1-3, TB, seed) so "who's ahead" agrees everywhere.
  const byStandingsDesc = (a: RawRecord, b: RawRecord) => {
    const [a1, a2, a3] = tieBreakValues(a);
    const [b1, b2, b3] = tieBreakValues(b);
    return (
      b1 - a1 ||
      b2 - a2 ||
      b3 - a3 ||
      (winsVsTied.get(b.id) ?? 0) - (winsVsTied.get(a.id) ?? 0) ||
      a.seed - b.seed
    );
  };

  const standingsOrder = [...records.values()].sort((a, b) => b.score - a.score || byStandingsDesc(a, b));
  const bands: RawRecord[][] = [];
  for (const r of standingsOrder) {
    const currentBand = bands[bands.length - 1];
    if (currentBand && currentBand[0].score === r.score) currentBand.push(r);
    else bands.push([r]);
  }

  const opponentsOf = (id: string) => new Set(records.get(id)?.results.map((r) => r.opponentId).filter(Boolean));

  const pairings: SwissPairing[] = [];
  let incomingFloater: RawRecord | null = null;

  for (let i = 0; i < bands.length; i++) {
    const isLastBand = i === bands.length - 1;
    const pool = [...bands[i]].sort(byStandingsDesc);

    if (incomingFloater) {
      const partner = pool.shift()!; // this band's own best-ranked member
      pairings.push({ matchNumber: pairings.length + 1, participantAId: incomingFloater.id, participantBId: partner.id });
      incomingFloater = null;
    }

    let outgoingFloater: RawRecord | null = null;
    if (pool.length % 2 === 1) {
      if (isLastBand) {
        // No band left to receive it — this is the round's bye. Prefer
        // whoever hasn't already had one, scanning from the worst-ranked
        // end (falls back to the worst-ranked regardless if everyone left
        // in this band already has a bye).
        const idx = [...pool].reverse().findIndex((r) => r.byes === 0);
        const byeIndex = idx === -1 ? pool.length - 1 : pool.length - 1 - idx;
        outgoingFloater = pool[byeIndex];
        pool.splice(byeIndex, 1);
      } else {
        outgoingFloater = pool.pop()!; // worst-ranked, last after best-first sort
      }
    }

    const half = pool.length / 2;
    const top = pool.slice(0, half);
    const remainingBottom = pool.slice(half);
    for (const a of top) {
      const played = opponentsOf(a.id);
      let idx = remainingBottom.findIndex((b) => !played.has(b.id));
      if (idx === -1) idx = 0;
      const b = remainingBottom.splice(idx, 1)[0];
      pairings.push({ matchNumber: pairings.length + 1, participantAId: a.id, participantBId: b.id });
    }

    incomingFloater = outgoingFloater;
  }

  if (incomingFloater) {
    pairings.push({ matchNumber: pairings.length + 1, participantAId: incomingFloater.id, participantBId: null });
  }

  return pairings;
}
