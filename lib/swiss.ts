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

// Pairs `left[i]` with the nearest fresh (not-yet-played) member of `right`,
// scanning left-to-right and falling back to the first still-available
// member if every remaining candidate has already been played (a forced
// rematch — rare, and only possible once a band is deep enough into repeat
// history that no fresh option is left in that pool). This one routine
// backs every fold in generateNextRoundPairings below, whether it's a
// plain top-half-vs-bottom-half split or the offset pairing a float
// produces — `left`/`right` just need to already be in "natural partner"
// order (left[i] <-> right[i]).
function pairWithRematchAvoidance(
  left: RawRecord[],
  right: RawRecord[],
  opponentsOf: (id: string) => Set<string>
): [RawRecord, RawRecord][] {
  const remaining: (RawRecord | null)[] = [...right];
  const out: [RawRecord, RawRecord][] = [];
  for (const a of left) {
    const played = opponentsOf(a.id);
    let idx = remaining.findIndex((b) => b && !played.has(b.id));
    if (idx === -1) idx = remaining.findIndex((b) => b !== null);
    const b = remaining[idx]!;
    remaining[idx] = null;
    out.push([a, b]);
  }
  return out;
}

// Straight top-half-vs-bottom-half fold of an already-even, best-first-
// sorted pool: pool[0] vs pool[half], pool[1] vs pool[half+1], etc.
function foldEvenPool(pool: RawRecord[], opponentsOf: (id: string) => Set<string>): [RawRecord, RawRecord][] {
  const half = pool.length / 2;
  return pairWithRematchAvoidance(pool.slice(0, half), pool.slice(half), opponentsOf);
}

// Round 2+: standard Swiss "fold" pairing, score-band by score-band, ranked
// within each band by ORIGINAL SEED (not the standings table's own
// tie-break metrics, which are a separate, later-blooming concern for
// deciding placement, not who plays whom). This was verified match-for-
// match against a real 42-player Challonge tournament's actual Round 1 ->
// Round 2 pairings — every one of that round's 21 pairings, including the
// two cross-band floats, came out identical once ranking went back to seed.
//
// 1. Group everyone into score bands (highest score first), each sorted by
//    seed ascending (lowest seed = best-ranked).
// 2. A band with no incoming float and an even headcount folds straight:
//    top half vs bottom half (foldEvenPool).
// 3. A band with no incoming float and an odd headcount sends its worst-
//    ranked (last) member down to the next band, then folds the rest — or,
//    if it's the last band with nowhere to send it, that member instead
//    sits out (preferring whoever hasn't already had a bye).
// 4. A band that RECEIVES a float:
//    - Odd headcount: this always fully resolves the float (odd + 1 =
//      even). The float pairs with the band's own best-ranked (rank 1)
//      member. That leaves one natural pairing "orphaned" — rank 1's own
//      old partner (rank `1+offset`, offset = ceil(N/2)) and the band's
//      own middle-ranked member (rank `offset`, which an ordinary N-sized
//      fold would otherwise leave floating) — so those two pair with each
//      other instead, but as this band's LAST match number, not the one
//      right after the float (verified against real match numbering, not
//      just the pairing set — Round 1 -> 2's Match 42 is that redirect
//      pair, coming after Matches 33-41's ordinary offset pairs, not
//      Match 33 itself). Every other pair keeps its natural fold partner
//      `offset` ranks below it. (This asymmetric-looking "offset = ceil,
//      not floor" shape, plus the orphan-pair redirect, is exactly what
//      the real Round 1 -> 2 data showed — a plain top/bottom fold of the
//      remaining N-1 members does NOT reproduce it.)
//    - Even headcount: the float pairs with the band's rank 1, and the
//      remaining (now odd) N-1 fold normally with the worst-ranked member
//      sent on down to the next band in turn (or benched with a bye, if
//      this was the last band).
// 5. Rematch avoidance is a "nearest fresh partner" scan within whichever
//    fold is being computed (pairWithRematchAvoidance) — not a full
//    min-conflict matching. lib/matching.ts has a real max-weight-matching
//    solver already available (built for this exact problem) if a future
//    pass wants to replace this with something that resolves the
//    highest-round, most-cascaded floats more precisely; empirically it
//    didn't outperform this approach without a lot more tuning of what its
//    weight function should reward, so it's not wired in here yet.
export function generateNextRoundPairings(
  participants: TournamentParticipant[],
  matches: Match[],
  swissPoints: SwissPoints
): SwissPairing[] {
  const records = buildRawRecords(
    participants.map((p) => ({ id: p.id, seed: p.seed })),
    matches,
    swissPoints
  );
  const opponentsOf = (id: string) =>
    new Set(records.get(id)?.results.map((r) => r.opponentId).filter((oid): oid is string => oid !== null));

  const standingsOrder = [...records.values()].sort((a, b) => b.score - a.score || a.seed - b.seed);
  const bands: RawRecord[][] = [];
  for (const r of standingsOrder) {
    const currentBand = bands[bands.length - 1];
    if (currentBand && currentBand[0].score === r.score) currentBand.push(r);
    else bands.push([r]);
  }

  const pairings: SwissPairing[] = [];
  function addPairing(a: RawRecord, b: RawRecord) {
    pairings.push({ matchNumber: pairings.length + 1, participantAId: a.id, participantBId: b.id });
  }

  // Prefers whoever hasn't already had one, scanning from the worst-ranked
  // end (falls back to the worst-ranked regardless if everyone left has
  // already had a bye). Used both for the true "sits this round out" bye
  // and for benching a float that has nowhere left to land.
  function pickByeCandidate(pool: RawRecord[]): number {
    const idx = [...pool].reverse().findIndex((r) => r.byes === 0);
    return idx === -1 ? pool.length - 1 : pool.length - 1 - idx;
  }

  let incomingFloater: RawRecord | null = null;

  for (let i = 0; i < bands.length; i++) {
    const isLastBand = i === bands.length - 1;
    const pool = bands[i]; // already seed-ascending from standingsOrder

    if (!incomingFloater) {
      if (pool.length % 2 === 0) {
        for (const [a, b] of foldEvenPool(pool, opponentsOf)) addPairing(a, b);
        incomingFloater = null;
      } else if (isLastBand) {
        const byeIndex = pickByeCandidate(pool);
        const bye = pool[byeIndex];
        const rest = [...pool.slice(0, byeIndex), ...pool.slice(byeIndex + 1)];
        for (const [a, b] of foldEvenPool(rest, opponentsOf)) addPairing(a, b);
        pairings.push({ matchNumber: pairings.length + 1, participantAId: bye.id, participantBId: null });
        incomingFloater = null;
      } else {
        const outgoing = pool[pool.length - 1];
        for (const [a, b] of foldEvenPool(pool.slice(0, -1), opponentsOf)) addPairing(a, b);
        incomingFloater = outgoing;
      }
      continue;
    }

    // Receiving a floater from the band above.
    const floater = incomingFloater;
    if (pool.length === 1) {
      addPairing(floater, pool[0]);
      incomingFloater = null;
    } else if (pool.length % 2 === 1) {
      // Match-number order matters here, not just the pairing set: verified
      // against real Round 1 -> 2 data, the "orphan" redirect pair (rank
      // `offset` with rank `1+offset` — see this function's doc comment)
      // is always the LAST match number this band produces, not the one
      // right after the float. Every other pair keeps its natural
      // ascending order (rank 1+i vs rank 1+i+offset, i = 1..offset-2).
      //
      // Every one of those ordinary pairs puts the LOWER rank number (the
      // better seed) into `left`/participant A — pool.slice(1, offset-1)
      // (ranks 2..offset-1) is strictly lower-ranked than pool.slice(offset+1)
      // (ranks offset+2..N). The redirect pair is ranks (offset-1, offset)
      // — same rule, so rank (offset-1) (the lower of the two) goes to
      // `left` and rank `offset` to `right`, not the other way around.
      const offset = Math.ceil(pool.length / 2);
      const left = [floater, ...pool.slice(1, offset - 1), pool[offset - 1]];
      const right = [pool[0], ...pool.slice(offset + 1), pool[offset]];
      for (const [a, b] of pairWithRematchAvoidance(left, right, opponentsOf)) addPairing(a, b);
      incomingFloater = null;
    } else {
      for (const [a, b] of pairWithRematchAvoidance([floater], [pool[0]], opponentsOf)) addPairing(a, b);
      const rest = pool.slice(1); // odd
      if (isLastBand) {
        const byeIndex = pickByeCandidate(rest);
        const bye = rest[byeIndex];
        const working = [...rest.slice(0, byeIndex), ...rest.slice(byeIndex + 1)];
        for (const [a, b] of foldEvenPool(working, opponentsOf)) addPairing(a, b);
        pairings.push({ matchNumber: pairings.length + 1, participantAId: bye.id, participantBId: null });
        incomingFloater = null;
      } else {
        const outgoing = rest[rest.length - 1];
        for (const [a, b] of foldEvenPool(rest.slice(0, -1), opponentsOf)) addPairing(a, b);
        incomingFloater = outgoing;
      }
    }
  }

  if (incomingFloater) {
    pairings.push({ matchNumber: pairings.length + 1, participantAId: incomingFloater.id, participantBId: null });
  }

  return pairings;
}
