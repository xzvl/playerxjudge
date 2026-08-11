import type { BracketFormat, Tournament } from "@/lib/types/database";
import type { RegistrationStatus, ReportStatus } from "@/lib/mock/organizer-dashboard";

// There are no DB tables yet for brackets/groups/standings/announcements/log/
// stations (see the note at the top of `organizer-dashboard.ts` — the whole
// bracket pipeline is still mock). Rather than a static lookup table keyed by
// slug (which would only ever cover the seed tournaments), this *derives* a
// full, stable workspace from any real `tournaments` row: same tournament id
// always renders the same roster/bracket/log on every visit, using a seeded
// PRNG instead of `Math.random()`.

function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0;
  }
  return hash;
}

const SOLO_NAMES = [
  "J. Reyes", "M. Santos", "A. Cruz", "K. Villareal", "D. Manalo", "L. Villanueva",
  "R. Aquino", "N. Bautista", "P. Ramos", "K. Tan", "R. Dela Cruz", "S. Fernandez",
  "C. Garcia", "E. Mendoza", "T. Torres", "V. Bautista", "G. Castillo", "H. Ocampo",
  "F. Del Rosario", "B. Aguilar", "I. Navarro", "O. Marquez", "Q. Domingo", "U. Salazar",
];

const TEAM_NAMES = [
  "Team Voltbreak", "Team Overdrive", "Team Frostbyte", "Team Aetherblade",
  "Team Ironclad", "Team Ignis", "Team Nova", "Team Riptide",
];

const FINISH_TYPES = ["spin", "burst", "extreme", "over"] as const;
export type FinishType = (typeof FINISH_TYPES)[number];

const REPORT_REASON_TEMPLATES = [
  "No-show for scheduled match.",
  "Suspected illegal part / stadium combo.",
  "Unsportsmanlike conduct during the match.",
  "Score was reported incorrectly by the judge.",
];

const ANNOUNCEMENT_TEMPLATES = [
  "Bracket has been seeded — check your first match time and station assignment.",
  "Registration closes in 24 hours. Get your entry fee settled to lock your seed.",
  "Venue parking update: use the east gate after 9 AM, the main lot is full.",
  "Reminder: bring your own stadium and launcher. Loaner sets are limited.",
  "Weather looks clear — the event is proceeding as scheduled.",
  "Livestream link is up. Come cheer on your favorite bladers!",
];

export interface WorkspaceParticipant {
  id: string;
  name: string;
  teamName: string | null;
  seed: number;
  wins: number;
  losses: number;
  points: number;
  status: RegistrationStatus;
  groupLabel: string | null;
}

export interface WorkspaceMatch {
  id: string;
  round: string;
  a: WorkspaceParticipant | null;
  b: WorkspaceParticipant | null;
  scoreA: number | null;
  scoreB: number | null;
  winnerId: string | null;
  finishType: FinishType | null;
  status: "pending" | "in_progress" | "complete";
  stationName: string | null;
}

export interface WorkspaceGroup {
  label: string;
  standings: WorkspaceParticipant[];
}

export interface WorkspaceBracketRound {
  label: string;
  matches: WorkspaceMatch[];
}

export interface WorkspaceAnnouncement {
  id: string;
  author: string;
  message: string;
  postedAt: string;
}

export interface WorkspaceLogEntry {
  id: string;
  actor: string;
  action: string;
  at: string;
}

export interface WorkspaceStation {
  id: string;
  name: string;
  status: "idle" | "in_progress" | "complete";
  currentMatch: WorkspaceMatch | null;
}

export interface WorkspaceReport {
  id: string;
  reporterName: string;
  targetLabel: string;
  reason: string;
  status: ReportStatus;
  createdAt: string;
}

export interface TournamentWorkspace {
  isTwoStage: boolean;
  seedingReady: boolean;
  participants: WorkspaceParticipant[];
  groups: WorkspaceGroup[] | null;
  finalUsesBracket: boolean;
  finalFormat: BracketFormat;
  finalBracket: WorkspaceBracketRound[] | null;
  finalStandingsTable: WorkspaceParticipant[] | null;
  overallStandings: WorkspaceParticipant[];
  champion: WorkspaceParticipant | null;
  announcements: WorkspaceAnnouncement[];
  log: WorkspaceLogEntry[];
  stations: WorkspaceStation[];
  reports: WorkspaceReport[];
}

function nextPowerOfTwo(n: number) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function buildRoster(tournament: Tournament, rng: () => number): WorkspaceParticipant[] {
  const isTeam = tournament.battle_type !== "solo";
  const capacity = Math.max(4, Math.min(24, tournament.max_participants ?? 16));

  const fillRatioByStatus: Record<Tournament["status"], number> = {
    draft: 0,
    published: 0.3,
    registration_open: 0.6,
    registration_closed: 1,
    ongoing: 1,
    completed: 1,
    cancelled: 0.4,
  };
  const count = Math.round(capacity * (fillRatioByStatus[tournament.status] ?? 0.5));
  if (count === 0) return [];

  const namePool = isTeam ? TEAM_NAMES : SOLO_NAMES;
  const names = [...namePool];
  while (names.length < count) names.push(...namePool);

  const registeredStatus: RegistrationStatus =
    tournament.status === "ongoing" || tournament.status === "completed" ? "checked_in" : "confirmed";

  return Array.from({ length: count }, (_, i) => {
    const roll = rng();
    return {
      id: `${tournament.id}-p${i + 1}`,
      name: names[i],
      teamName: isTeam ? names[i] : null,
      seed: i + 1,
      wins: 0,
      losses: 0,
      points: 0,
      status: roll < 0.08 ? "pending" : roll > 0.94 ? "cancelled" : registeredStatus,
      groupLabel: null,
    };
  });
}

function pickWinner(a: WorkspaceParticipant, b: WorkspaceParticipant, rng: () => number) {
  // Lower seed number = presumed stronger, gets a mild edge — not a lock.
  const seedGap = b.seed - a.seed;
  const aChance = 0.5 + Math.max(-0.3, Math.min(0.3, seedGap * 0.03));
  return rng() < aChance ? a : b;
}

function playMatch(
  id: string,
  round: string,
  a: WorkspaceParticipant | null,
  b: WorkspaceParticipant | null,
  rng: () => number,
  resolve: boolean,
  stationName: string | null
): WorkspaceMatch {
  if (!a || !b) {
    const bye = a ?? b;
    return {
      id,
      round,
      a,
      b,
      scoreA: null,
      scoreB: null,
      winnerId: bye?.id ?? null,
      finishType: null,
      status: bye ? "complete" : "pending",
      stationName: null,
    };
  }

  if (!resolve) {
    return { id, round, a, b, scoreA: null, scoreB: null, winnerId: null, finishType: null, status: "pending", stationName };
  }

  const winner = pickWinner(a, b, rng);
  const loser = winner === a ? b : a;
  const winnerScore = 2;
  const loserScore = rng() < 0.5 ? 0 : 1;
  const finishType = FINISH_TYPES[Math.floor(rng() * FINISH_TYPES.length)];

  winner.wins += 1;
  loser.losses += 1;
  winner.points += 3;

  return {
    id,
    round,
    a,
    b,
    scoreA: winner === a ? winnerScore : loserScore,
    scoreB: winner === b ? winnerScore : loserScore,
    winnerId: winner.id,
    finishType,
    status: "complete",
    stationName,
  };
}

function roundLabel(roundParticipants: number, totalRounds: number, roundIndex: number): string {
  if (roundParticipants === 2) return "Grand Final";
  if (roundParticipants === 4) return "Semifinals";
  if (roundParticipants === 8) return "Quarterfinals";
  if (roundIndex === 0 && totalRounds > 4) return "Round of " + roundParticipants;
  return `Round ${roundIndex + 1}`;
}

function buildBracket(
  participants: WorkspaceParticipant[],
  tournamentId: string,
  rng: () => number,
  resolvedThroughRatio: number,
  stations: string[]
): WorkspaceBracketRound[] {
  if (participants.length === 0) return [];
  const size = nextPowerOfTwo(participants.length);
  const seeded: (WorkspaceParticipant | null)[] = [...participants];
  while (seeded.length < size) seeded.push(null);

  const totalRounds = Math.log2(size);
  let current = seeded;
  const rounds: WorkspaceBracketRound[] = [];

  for (let r = 0; r < totalRounds; r++) {
    const shouldResolve = r / totalRounds < resolvedThroughRatio;
    const matches: WorkspaceMatch[] = [];
    const next: (WorkspaceParticipant | null)[] = [];

    for (let m = 0; m < current.length / 2; m++) {
      const a = current[m * 2];
      const b = current[m * 2 + 1];
      const match = playMatch(
        `${tournamentId}-b${r}-${m}`,
        roundLabel(current.length, totalRounds, r),
        a,
        b,
        rng,
        shouldResolve,
        shouldResolve && a && b ? stations[m % stations.length] ?? null : null
      );
      matches.push(match);
      next.push(match.winnerId ? [a, b].find((p) => p?.id === match.winnerId) ?? null : null);
    }

    rounds.push({ label: roundLabel(current.length, totalRounds, r), matches });
    current = next;
  }

  return rounds;
}

function buildStandingsTable(participants: WorkspaceParticipant[], rng: () => number, rounds: number): WorkspaceParticipant[] {
  for (const p of participants) {
    for (let r = 0; r < rounds; r++) {
      const seedBias = 0.5 + Math.max(-0.2, Math.min(0.2, (participants.length / 2 - p.seed) * 0.02));
      if (rng() < seedBias) {
        p.wins += 1;
        p.points += 3;
      } else {
        p.losses += 1;
      }
    }
  }
  return [...participants].sort((x, y) => y.points - x.points || y.wins - x.wins || x.seed - y.seed);
}

export function getTournamentWorkspace(tournament: Tournament): TournamentWorkspace {
  const rng = mulberry32(hashSeed(tournament.id));
  const settings = tournament.format_settings;
  const isTwoStage = settings?.stageType === "two_stage";
  const finalFormat = isTwoStage ? settings.finalStage.format : settings?.singleStageFormat ?? "single_elimination";
  const finalUsesBracket = finalFormat === "single_elimination" || finalFormat === "double_elimination";

  const seedingReady = !["draft", "published", "registration_open"].includes(tournament.status);
  const resolvedThroughRatio =
    tournament.status === "completed" ? 1 : tournament.status === "ongoing" ? 0.6 : tournament.status === "cancelled" ? 0.25 : 0;

  const roster = buildRoster(tournament, rng);
  const registered = roster.filter((p) => p.status !== "cancelled" && p.status !== "pending");

  const stationCount = Math.max(2, Math.min(8, Math.ceil(roster.length / 4) || 2));
  const stationNames = Array.from({ length: stationCount }, (_, i) => `Station ${i + 1}`);

  let groups: WorkspaceGroup[] | null = null;
  let finalists = registered;

  if (isTwoStage && seedingReady && registered.length > 0) {
    const perGroup = Math.max(2, settings.groupStage.participantsPerGroup);
    const advancePerGroup = Math.max(1, settings.groupStage.participantsAdvancePerGroup);
    const groupCount = Math.max(1, Math.ceil(registered.length / perGroup));
    const labels = Array.from({ length: groupCount }, (_, i) => String.fromCharCode(65 + i));

    const buckets: WorkspaceParticipant[][] = labels.map(() => []);
    registered.forEach((p, i) => {
      p.groupLabel = labels[i % groupCount];
      buckets[i % groupCount].push(p);
    });

    const groupRounds = Math.max(2, Math.min(6, buckets[0]?.length - 1 || 3));
    groups = labels.map((label, i) => ({
      label: `Group ${label}`,
      standings:
        tournament.status === "registration_closed"
          ? [...buckets[i]].sort((a, b) => a.seed - b.seed)
          : buildStandingsTable(buckets[i], rng, groupRounds),
    }));

    finalists = groups.flatMap((g) => g.standings.slice(0, advancePerGroup));
  }

  let finalBracket: WorkspaceBracketRound[] | null = null;
  let finalStandingsTable: WorkspaceParticipant[] | null = null;
  let overallStandings: WorkspaceParticipant[] = [];
  let champion: WorkspaceParticipant | null = null;

  if (seedingReady && finalists.length > 0) {
    if (finalUsesBracket) {
      finalBracket = buildBracket(finalists, tournament.id, rng, resolvedThroughRatio, stationNames);
      const lastRound = finalBracket[finalBracket.length - 1];
      const lastMatch = lastRound?.matches[0];
      if (lastMatch?.winnerId) {
        champion = [lastMatch.a, lastMatch.b].find((p) => p?.id === lastMatch.winnerId) ?? null;
      }
      overallStandings = [...finalists].sort((a, b) => b.wins - a.wins || a.losses - b.losses || a.seed - b.seed);
    } else {
      const rounds = Math.max(3, Math.min(7, finalists.length - 1 || 3));
      finalStandingsTable = buildStandingsTable(finalists, rng, resolvedThroughRatio > 0 ? rounds : 0);
      overallStandings = finalStandingsTable;
      champion = tournament.status === "completed" ? overallStandings[0] ?? null : null;
    }
  }

  // Stations: assign whichever bracket matches are currently in progress.
  const inProgressMatches = (finalBracket ?? []).flatMap((round) => round.matches).filter((m) => m.status === "complete" && m.stationName);
  const stations: WorkspaceStation[] = stationNames.map((name, i) => {
    const hosted = inProgressMatches[i] ?? null;
    return {
      id: `${tournament.id}-station-${i + 1}`,
      name,
      status: tournament.status === "ongoing" ? (hosted ? "complete" : i < 2 ? "in_progress" : "idle") : tournament.status === "completed" ? "complete" : "idle",
      currentMatch: tournament.status === "ongoing" ? hosted : null,
    };
  });

  const announcements: WorkspaceAnnouncement[] = ANNOUNCEMENT_TEMPLATES.slice(0, 2 + Math.floor(rng() * 3)).map((message, i) => ({
    id: `${tournament.id}-ann${i + 1}`,
    author: "Organizer",
    message,
    postedAt: new Date(new Date(tournament.starts_at).getTime() - (i + 1) * 26 * 60 * 60 * 1000).toISOString(),
  }));

  const log: WorkspaceLogEntry[] = [];
  log.push({ id: `${tournament.id}-log-created`, actor: "System", action: `Tournament "${tournament.title}" was created.`, at: tournament.created_at });
  if (tournament.status !== "draft") {
    log.push({ id: `${tournament.id}-log-published`, actor: "Organizer", action: "Published the tournament listing.", at: tournament.updated_at });
  }
  announcements.forEach((a) => log.push({ id: `${a.id}-log`, actor: a.author, action: `Posted an announcement: "${a.message}"`, at: a.postedAt }));
  registered.slice(0, 6).forEach((p) => log.push({ id: `${p.id}-log-reg`, actor: p.name, action: "Registered for the tournament.", at: tournament.created_at }));
  (finalBracket ?? []).flatMap((r) => r.matches).filter((m) => m.status === "complete" && m.a && m.b).forEach((m) => {
    log.push({
      id: `${m.id}-log`,
      actor: "Judge",
      action: `${m.round}: ${m.winnerId === m.a?.id ? m.a?.name : m.b?.name} defeated ${m.winnerId === m.a?.id ? m.b?.name : m.a?.name} (${m.scoreA}-${m.scoreB}, ${m.finishType} finish).`,
      at: tournament.starts_at,
    });
  });
  const reportCount = registered.length >= 2 && seedingReady ? Math.floor(rng() * 3) : 0;
  const reports: WorkspaceReport[] = Array.from({ length: reportCount }, (_, i) => {
    const reporter = registered[Math.floor(rng() * registered.length)];
    const target = registered[Math.floor(rng() * registered.length)];
    const statusRoll = rng();
    return {
      id: `${tournament.id}-report${i + 1}`,
      reporterName: reporter.name,
      targetLabel: target.teamName ?? target.name,
      reason: REPORT_REASON_TEMPLATES[Math.floor(rng() * REPORT_REASON_TEMPLATES.length)],
      status: statusRoll < 0.5 ? "open" : statusRoll < 0.8 ? "resolved" : "dismissed",
      createdAt: tournament.starts_at,
    };
  });
  reports.forEach((r) =>
    log.push({ id: `${r.id}-log`, actor: r.reporterName, action: `Filed a report against ${r.targetLabel}: "${r.reason}"`, at: r.createdAt })
  );
  log.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return {
    isTwoStage,
    seedingReady,
    participants: roster,
    groups,
    finalUsesBracket,
    finalFormat,
    finalBracket,
    finalStandingsTable,
    overallStandings,
    champion,
    announcements,
    log,
    stations,
    reports,
  };
}
