// The Final Stage bracket, seeded with either placeholder slots ("1st in
// Group A") before the group stage ends, or the real advancing participants'
// names once it has.
//
// Round 1 becomes real once "Start the Final Stage" is clicked (see
// buildRound1Pairings + startFinalStage in matches-actions.ts); each
// following round becomes real once the organizer generates it from the
// previous round's winners (see generateNextFinalRound in matches-actions.ts,
// mirroring lib/swiss.ts's round generation for the group stage).

import type { WorkspaceBracketRound, WorkspaceMatch, WorkspaceParticipant } from "@/lib/mock/tournament-workspace";
import type { Match, TournamentGroup } from "@/lib/types/database";

export function ordinal(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`;
}

// A participant-facing label for their current spot in `computeFinalStandings`'
// rank order — the top 4 ranks get their own title (there's only ever one
// Champion, one 1st Runner Up, ...), everyone else is grouped by the power-
// of-two bracket size they were still alive in when eliminated: 5th-8th all
// read "Top 8 Finalist", 9th-16th "Top 16 Finalist", and so on.
export function finalRankLabel(rank: number): string {
  if (rank === 1) return "Champion";
  if (rank === 2) return "1st Runner Up";
  if (rank === 3) return "2nd Runner Up";
  if (rank === 4) return "3rd Runner Up";
  let threshold = 8;
  while (rank > threshold) threshold *= 2;
  return `Top ${threshold} Finalist`;
}

export function nextPowerOfTwo(n: number) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

// Standard "Ranked Bracket Seeding" placement order (1v8, 4v5, 2v7, 3v6 for
// a field of 8, recursively) — keeps top seeds apart for as long as possible
// instead of pairing adjacent ranks, and gives byes to the highest seeds
// rather than letting two byes collide with each other.
export function seedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const n = order.length * 2;
    order = order.flatMap((seed) => [seed, n + 1 - seed]);
  }
  return order;
}

function roundLabel(participantsInRound: number, totalRounds: number, roundIndex: number): string {
  if (participantsInRound === 2) return "Grand Final";
  if (participantsInRound === 4) return "Semifinals";
  if (participantsInRound === 8) return "Quarterfinals";
  if (roundIndex === 0 && totalRounds > 4) return `Round of ${participantsInRound}`;
  return `Round ${roundIndex + 1}`;
}

function blankSlot(id: string, name: string, seed: number, groupLabel: string | null): WorkspaceParticipant {
  return { id, name, teamName: null, seed, wins: 0, losses: 0, points: 0, status: "confirmed", groupLabel };
}

// One slot per (group, rank) pair, ordered rank-major (every group's 1st,
// then every group's 2nd, ...) — standard cross-group seeding, keeps
// same-group entrants apart in early rounds under normal bracket seeding.
export function placeholderSlots(groups: TournamentGroup[], advancePerGroup: number): WorkspaceParticipant[] {
  const slots: WorkspaceParticipant[] = [];
  let seed = 1;
  for (let rank = 1; rank <= advancePerGroup; rank++) {
    for (const g of groups) {
      slots.push(blankSlot(`placeholder-${g.id}-rank${rank}`, `${ordinal(rank)} in Group ${g.label}`, seed++, g.label));
    }
  }
  return slots;
}

export function qualifiedSlots(
  groups: TournamentGroup[],
  standingsByGroupId: Map<string, { participantId: string; name: string; teamName: string | null }[]>,
  advancePerGroup: number
): WorkspaceParticipant[] {
  const slots: WorkspaceParticipant[] = [];
  let seed = 1;
  for (let rank = 0; rank < advancePerGroup; rank++) {
    for (const g of groups) {
      const row = standingsByGroupId.get(g.id)?.[rank];
      if (!row) continue;
      slots.push(blankSlot(row.participantId, row.teamName ?? row.name, seed++, g.label));
    }
  }
  return slots;
}

export function buildSeededBracket(slots: WorkspaceParticipant[]): WorkspaceBracketRound[] {
  if (slots.length === 0) return [];

  const size = nextPowerOfTwo(slots.length);
  const padded: (WorkspaceParticipant | null)[] = [...slots];
  while (padded.length < size) padded.push(null);

  // Reorder into ranked bracket seeding order before pairing round 1 —
  // `padded` is still rank-major (1st, 2nd, 3rd, ...); `seeded` is the order
  // seeds actually meet in, so consecutive pairs below are 1v8, 4v5, etc.
  const seeded = seedOrder(size).map((position) => padded[position - 1]);

  const totalRounds = Math.log2(size);
  const rounds: WorkspaceBracketRound[] = [];
  let current = seeded;

  for (let r = 0; r < totalRounds; r++) {
    const label = roundLabel(current.length, totalRounds, r);
    const matches: WorkspaceMatch[] = [];
    const next: (WorkspaceParticipant | null)[] = [];

    for (let m = 0; m < current.length / 2; m++) {
      const a = current[m * 2];
      const b = current[m * 2 + 1];
      matches.push({
        id: `placeholder-r${r}-m${m}`,
        round: label,
        a,
        b,
        scoreA: null,
        scoreB: null,
        winnerId: null,
        finishType: null,
        status: "pending",
        stationName: null,
      });
      next.push(null);
    }

    rounds.push({ label, matches });
    current = next;
  }

  return rounds;
}

export interface FinalStagePairing {
  matchNumber: number;
  participantAId: string;
  participantBId: string | null; // null = bye
}

// Round 1 of the final bracket, in the same ranked-seeding order
// `buildSeededBracket` lays its own first round out in (1v8, 4v5, 2v7, 3v6,
// ...) — so real `matches` rows inserted from this line up with
// `buildSeededBracket(slots).rounds[0]` match-for-match. Used by
// startFinalStage (matches-actions.ts) to seed real Round 1 matches once the
// group stage has ended.
export function buildRound1Pairings(slots: { id: string }[]): FinalStagePairing[] {
  if (slots.length === 0) return [];

  const size = nextPowerOfTwo(slots.length);
  const padded: (string | null)[] = slots.map((s) => s.id);
  while (padded.length < size) padded.push(null);
  const seeded = seedOrder(size).map((position) => padded[position - 1]);

  const pairings: FinalStagePairing[] = [];
  for (let m = 0; m < seeded.length / 2; m++) {
    const a = seeded[m * 2];
    const b = seeded[m * 2 + 1];
    if (a === null) continue; // both slots empty — shouldn't happen with a real field, but stay safe
    pairings.push({ matchNumber: m + 1, participantAId: a, participantBId: b });
  }
  return pairings;
}

// Overlays real match rows (ids, status, score, winner) onto the synthetic
// bracket built by `buildSeededBracket` — a real match's `round` (1-indexed,
// matching what startFinalStage/generateNextFinalRound insert) and
// `match_number` line up exactly with a round's array index and matches
// index (see `buildRound1Pairings`/`generateNextFinalRound`'s pairing order).
// Rounds with no real matches yet are left as pending placeholders.
export function applyRealMatches(rounds: WorkspaceBracketRound[], realMatches: Match[]): WorkspaceBracketRound[] {
  if (rounds.length === 0 || realMatches.length === 0) return rounds;
  const byRoundAndNumber = new Map(realMatches.map((m) => [`${m.round}-${m.match_number}`, m]));

  return rounds.map((round, r) => ({
    ...round,
    matches: round.matches.map((match, i) => {
      const real = byRoundAndNumber.get(`${r + 1}-${i + 1}`);
      if (!real) return match;
      const score = real.score && "a" in real.score && "b" in real.score ? real.score : null;
      return {
        ...match,
        id: real.id,
        scoreA: score?.a ?? null,
        scoreB: score?.b ?? null,
        winnerId: real.winner_id,
        status: real.status === "completed" ? "complete" : real.status === "ongoing" ? "in_progress" : "pending",
      };
    }),
  }));
}

// Fills in the "TBD" slots of each round with whoever won the two matches
// feeding into it — display only, so it works purely off whatever rounds
// already have real data (currently just Round 1, via `applyRealRound1`).
// Doesn't create real match rows for the round being advanced into; the
// winner's name just appears in the bracket the moment their match is
// reported. Safe to run on a bracket with only placeholder rounds — nothing
// is ever "complete" there, so it's a no-op.
export function advanceWinners(rounds: WorkspaceBracketRound[]): WorkspaceBracketRound[] {
  if (rounds.length < 2) return rounds;
  const next = rounds.map((round) => ({ ...round, matches: round.matches.map((m) => ({ ...m })) }));

  for (let r = 0; r < next.length - 1; r++) {
    const feeders = next[r].matches;
    const upcoming = next[r + 1].matches;
    for (let m = 0; m < upcoming.length; m++) {
      for (const feeder of [feeders[m * 2], feeders[m * 2 + 1]]) {
        if (!feeder || feeder.status !== "complete" || !feeder.winnerId) continue;
        const winner = feeder.a?.id === feeder.winnerId ? feeder.a : feeder.b?.id === feeder.winnerId ? feeder.b : null;
        if (!winner) continue;
        if (upcoming[m].a === null) upcoming[m].a = winner;
        else if (upcoming[m].b === null) upcoming[m].b = winner;
      }
    }
  }

  return next;
}

// ============================================================
// Placement brackets ("3rd Place Match", "5th–8th Place Bracket", ...) —
// only built when the wizard's "Break ties with placement matches" is on.
//
// Single elimination only tells you one clear winner per bracket; everyone
// who loses along the way is left tied with everyone else who lost in the
// same round. Resolving those ties needs the SAME kind of bracket run again
// among just that round's losers — and *that* mini-bracket has the exact
// same problem one level down (its own semifinal losers are tied for two
// places), so the whole thing is naturally recursive. `buildPlacementSections`
// walks that recursion once, structurally (no real participants yet — see
// `populateSectionFromFeeder` for filling one in once its feeder round is
// actually played out).
// ============================================================

export interface PlacementSection {
  key: string; // stored in a `brackets` row's `structure.key` once generated
  label: string;
  basePlace: number;
  poolSize: number;
  // Where this section's Round 1 gets its participants from: the LOSERS of
  // `feederRound` in the main bracket (`feederKey: null`) or in another
  // placement section (`feederKey` = that section's `key`).
  feederKey: string | null;
  feederRound: number;
  rounds: WorkspaceBracketRound[];
}

function placementLabel(basePlace: number, poolSize: number): string {
  return poolSize === 2 ? `${ordinal(basePlace)} Place Match` : `${ordinal(basePlace)}–${ordinal(basePlace + poolSize - 1)} Place Bracket`;
}

// Structural (all-null) rounds for a placement section's own internal
// bracket — same shape `buildSeededBracket` would produce for `poolSize`
// participants, just without real slots yet. `roundOffset` keeps the round
// count continuing from wherever this section sits in the overall final
// stage (see deriveSections) instead of every section restarting at
// "Round 1" — a 3rd Place Match fed by the semifinals reads "Round 3" (it's
// played alongside the Grand Final), not "Round 1".
function buildBlankRounds(poolSize: number, key: string, roundOffset: number): WorkspaceBracketRound[] {
  if (poolSize < 2) return [];
  const totalRounds = Math.log2(poolSize);
  const rounds: WorkspaceBracketRound[] = [];
  let count = poolSize;

  for (let r = 0; r < totalRounds; r++) {
    const label = `Round ${roundOffset + r + 1}`;
    const matches: WorkspaceMatch[] = Array.from({ length: count / 2 }, (_, m) => ({
      id: `placeholder-${key}-r${r}-m${m}`,
      round: label,
      a: null,
      b: null,
      scoreA: null,
      scoreB: null,
      winnerId: null,
      finishType: null,
      status: "pending",
      stationName: null,
    }));
    rounds.push({ label, matches });
    count /= 2;
  }

  return rounds;
}

// `bracketTotalRounds`/`bracketKey`/`winnerPlace` describe whichever
// bracket we're deriving sub-ties for (the main bracket the first time
// through, then recursively each section's own internal bracket).
// `bracketBaseOffset` is that bracket's own round-count offset (0 for the
// main bracket, whose local round numbers already are the overall count) —
// a child section starts right as `feederRound` of its feeder finishes, so
// its own Round 1 continues at `bracketBaseOffset + feederRound + 1`.
function deriveSections(
  bracketTotalRounds: number,
  bracketKey: string | null,
  winnerPlace: number,
  throughPlace: number,
  bracketBaseOffset: number
): PlacementSection[] {
  const sections: PlacementSection[] = [];

  for (let d = 1; d < bracketTotalRounds; d++) {
    const poolSize = 2 ** d;
    const basePlace = winnerPlace + poolSize;
    if (basePlace > throughPlace) break;

    const key = `place-${basePlace}`;
    const feederRound = bracketTotalRounds - d;
    const sectionBaseOffset = bracketBaseOffset + feederRound;
    sections.push({
      key,
      label: placementLabel(basePlace, poolSize),
      basePlace,
      poolSize,
      feederKey: bracketKey,
      feederRound,
      rounds: buildBlankRounds(poolSize, key, sectionBaseOffset),
    });
    // This section's own bracket has `d` rounds; recurse into *its*
    // semifinal-loser-style ties the same way.
    sections.push(...deriveSections(d, key, basePlace, throughPlace, sectionBaseOffset));
  }

  return sections;
}

export function buildPlacementSections(mainBracketTotalRounds: number, throughPlace: number): PlacementSection[] {
  if (throughPlace < 3) return [];
  return deriveSections(mainBracketTotalRounds, null, 1, throughPlace, 0);
}

// A "Match #" display sequence spanning the WHOLE final stage — every main
// bracket round in order (Round 1, Round of 16, Quarterfinals, Semifinals,
// ...), then every placement section (3rd Place Match, 5th-8th Place
// Bracket, ...) in `buildPlacementSections`' own order, with the Grand
// Final (the main bracket's last round, always exactly one match) reserved
// for the very last number no matter when it's actually generated or
// completed. Purely a display concern — deliberately separate from the
// real `matches.match_number` column, which stays a round-local 1-indexed
// position (applyRealMatches/computeReadyPairings in matches-actions.ts
// both depend on that positional meaning to overlay real rows onto this
// bracket and to pair winners into the next round; renumbering it globally
// would break both). Computed purely from the bracket's shape (round/pool
// sizes), so it's identical for a placeholder preview and the real bracket,
// and doesn't depend on which matches have actually been played yet.
export interface FinalStageMatchNumberPlan {
  // key `${roundIndex}-${matchIndex}`, both 0-indexed — matches
  // WorkspaceBracketRound's own array positions (`rounds.map((round, r) =>
  // round.matches.map((match, i) => ...))`).
  main: Map<string, number>;
  // sectionKey -> its own `${roundIndex}-${matchIndex}` map, same shape as
  // `main` but scoped to that section's own (shorter) round array — each
  // placement section gets its own WorkspaceBracket render, so this is
  // keyed per-section rather than needing the section key baked into every
  // lookup key.
  placement: Map<string, Map<string, number>>;
}

export function buildFinalStageMatchNumberPlan(
  mainBracketTotalRounds: number,
  placementSections: PlacementSection[]
): FinalStageMatchNumberPlan {
  const main = new Map<string, number>();
  const placement = new Map<string, Map<string, number>>();
  let n = 1;

  // Every main-bracket round except the last (the Grand Final, handled
  // separately below) — round r (0-indexed) has 2^(mainBracketTotalRounds -
  // 1 - r) matches, halving each round same as buildSeededBracket.
  for (let r = 0; r < mainBracketTotalRounds - 1; r++) {
    const count = 2 ** (mainBracketTotalRounds - 1 - r);
    for (let i = 0; i < count; i++) main.set(`${r}-${i}`, n++);
  }

  for (const section of placementSections) {
    const totalRounds = Math.log2(section.poolSize);
    const sectionMap = new Map<string, number>();
    for (let r = 0; r < totalRounds; r++) {
      const count = section.poolSize / 2 ** (r + 1);
      for (let i = 0; i < count; i++) sectionMap.set(`${r}-${i}`, n++);
    }
    placement.set(section.key, sectionMap);
  }

  // Grand Final — always the main bracket's last round, always exactly 1
  // match — gets the very last number, after every placement match.
  if (mainBracketTotalRounds > 0) main.set(`${mainBracketTotalRounds - 1}-0`, n);

  return { main, placement };
}

function loserOf(match: WorkspaceMatch): WorkspaceParticipant | null {
  if (match.status !== "complete" || !match.winnerId) return null;
  if (match.a?.id === match.winnerId) return match.b;
  if (match.b?.id === match.winnerId) return match.a;
  return null;
}

// Fills a section's Round 1 with the losers of its feeder round, in the same
// positional pairing `advanceWinners` uses for winners (feeder matches 2m
// and 2m+1 -> this section's match m). `feederRounds` should already have
// real data overlaid (via `applyRealMatches`) and, if the feeder is itself a
// placement section, already be advanced (via `advanceWinners`).
export function populateSectionFromFeeder(section: PlacementSection, feederRounds: WorkspaceBracketRound[]): PlacementSection {
  const feederMatches = feederRounds[section.feederRound - 1]?.matches ?? [];
  const [firstRound, ...rest] = section.rounds;
  if (!firstRound) return section;

  return {
    ...section,
    rounds: [
      {
        ...firstRound,
        matches: firstRound.matches.map((m, i) => {
          const a = m.a ?? (feederMatches[i * 2] ? loserOf(feederMatches[i * 2]) : null);
          const b = m.b ?? (feederMatches[i * 2 + 1] ? loserOf(feederMatches[i * 2 + 1]) : null);
          return { ...m, a, b };
        }),
      },
      ...rest,
    ],
  };
}

export interface FinalStandingRow {
  participantId: string;
  seed: number;
  name: string;
  teamName: string | null;
  matchHistory: { round: number; result: "W" | "L" | "BYE" | "TBD" }[];
}

// "Rank/Participant/Match History" table for the Standings page's Final
// Stage tab. With only Round 1 real so far (see file header), rank is just
// "still alive, by seed" then "eliminated in Round 1, by seed" — extend the
// eliminatedRound sort once later rounds exist.
export function computeFinalStandings(slots: WorkspaceParticipant[], finalMatches: Match[]): FinalStandingRow[] {
  const rows = new Map<string, FinalStandingRow & { eliminatedRound: number | null }>(
    slots.map((s) => [s.id, { participantId: s.id, seed: s.seed, name: s.name, teamName: s.teamName, matchHistory: [], eliminatedRound: null }])
  );

  const sorted = [...finalMatches].sort((a, b) => a.round - b.round || a.match_number - b.match_number);
  for (const m of sorted) {
    const a = m.participant_a_id ? rows.get(m.participant_a_id) : undefined;
    const b = m.participant_b_id ? rows.get(m.participant_b_id) : undefined;

    if (a && m.participant_b_id === null) {
      a.matchHistory.push({ round: m.round, result: "BYE" });
      continue;
    }
    if (!a || !b) continue;

    if (m.status !== "completed" || !m.winner_id) {
      a.matchHistory.push({ round: m.round, result: "TBD" });
      b.matchHistory.push({ round: m.round, result: "TBD" });
      continue;
    }

    if (m.winner_id === a.participantId) {
      a.matchHistory.push({ round: m.round, result: "W" });
      b.matchHistory.push({ round: m.round, result: "L" });
      b.eliminatedRound = m.round;
    } else {
      b.matchHistory.push({ round: m.round, result: "W" });
      a.matchHistory.push({ round: m.round, result: "L" });
      a.eliminatedRound = m.round;
    }
  }

  return [...rows.values()].sort((x, y) => {
    const xAlive = x.eliminatedRound === null;
    const yAlive = y.eliminatedRound === null;
    if (xAlive !== yAlive) return xAlive ? -1 : 1;
    if (!xAlive && !yAlive && x.eliminatedRound !== y.eliminatedRound) return y.eliminatedRound! - x.eliminatedRound!;
    return x.seed - y.seed;
  });
}
