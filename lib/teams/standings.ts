// League standings for one team league, computed from its logged matches.
//
// Each match is one roster player vs an outside opponent, scored from the
// player's side (player_points vs opponent_points). Columns:
//
//   W-L-T     match record (more points = win, equal = tie)
//   Score     match score: 3 per win, 1 per tie
//   Pts       points scored (sum of player_points)
//   Pts diff  points scored minus points conceded
//   Buchholz  sum of each opponent's Score, once per meeting. Opponents are
//             outside players, so their Score comes from their results
//             against this team in this league (identified by name,
//             case-insensitive).
//   TB        Sonneborn-Berger: opponents' Score summed over the matches
//             you won, plus half of it over the matches you tied. Rewards
//             beating strong opponents.
//
// Ranking: Score, then Buchholz, then TB, then Pts diff, then Pts.

export interface StandingsPlayer {
  profileId: string;
  name: string;
}

export interface StandingsMatch {
  id: string;
  profileId: string;
  opponentName: string;
  playerPoints: number;
  opponentPoints: number;
}

export type MatchResult = "W" | "L" | "T";

export interface StandingsRow {
  rank: number;
  profileId: string;
  name: string;
  played: number;
  wins: number;
  losses: number;
  ties: number;
  score: number;
  points: number;
  pointsAgainst: number;
  pointsDiff: number;
  buchholz: number;
  tiebreak: number;
  // Most recent last, in the order matches were passed in.
  form: MatchResult[];
}

export const WIN_SCORE = 3;
export const TIE_SCORE = 1;

export function matchResult(playerPoints: number, opponentPoints: number): MatchResult {
  if (playerPoints > opponentPoints) return "W";
  if (playerPoints < opponentPoints) return "L";
  return "T";
}

export function opponentKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

// `matches` should be in chronological order (oldest first) so `form`
// reads left to right. Players on the roster with no matches still get a
// row (all zeros) so the table always shows the full roster.
export function computeLeagueStandings(players: StandingsPlayer[], matches: StandingsMatch[]): StandingsRow[] {
  const opponentScore = new Map<string, number>();
  for (const m of matches) {
    const result = matchResult(m.playerPoints, m.opponentPoints);
    // The opponent's view of the same match: our loss is their win.
    const gained = result === "L" ? WIN_SCORE : result === "T" ? TIE_SCORE : 0;
    const key = opponentKey(m.opponentName);
    opponentScore.set(key, (opponentScore.get(key) ?? 0) + gained);
  }

  const rows = new Map<string, StandingsRow>();
  const ensureRow = (profileId: string, name: string) => {
    let row = rows.get(profileId);
    if (!row) {
      row = {
        rank: 0,
        profileId,
        name,
        played: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        score: 0,
        points: 0,
        pointsAgainst: 0,
        pointsDiff: 0,
        buchholz: 0,
        tiebreak: 0,
        form: [],
      };
      rows.set(profileId, row);
    }
    return row;
  };

  for (const p of players) ensureRow(p.profileId, p.name);

  for (const m of matches) {
    // A match for someone since removed from the roster still counts
    // toward their own row, so history doesn't silently vanish.
    const row = ensureRow(m.profileId, players.find((p) => p.profileId === m.profileId)?.name ?? "Former player");
    const result = matchResult(m.playerPoints, m.opponentPoints);
    const oppScore = opponentScore.get(opponentKey(m.opponentName)) ?? 0;

    row.played += 1;
    row.points += m.playerPoints;
    row.pointsAgainst += m.opponentPoints;
    row.buchholz += oppScore;
    row.form.push(result);

    if (result === "W") {
      row.wins += 1;
      row.score += WIN_SCORE;
      row.tiebreak += oppScore;
    } else if (result === "T") {
      row.ties += 1;
      row.score += TIE_SCORE;
      row.tiebreak += oppScore / 2;
    } else {
      row.losses += 1;
    }
  }

  const sorted = [...rows.values()]
    .map((row) => ({ ...row, pointsDiff: row.points - row.pointsAgainst }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.buchholz - a.buchholz ||
        b.tiebreak - a.tiebreak ||
        b.pointsDiff - a.pointsDiff ||
        b.points - a.points ||
        a.name.localeCompare(b.name)
    );

  // Equal on every ranked column = shared rank.
  sorted.forEach((row, index) => {
    const prev = sorted[index - 1];
    const tied =
      prev &&
      prev.score === row.score &&
      prev.buchholz === row.buchholz &&
      prev.tiebreak === row.tiebreak &&
      prev.pointsDiff === row.pointsDiff &&
      prev.points === row.points;
    row.rank = tied ? prev.rank : index + 1;
  });

  return sorted;
}

// "Generate elite": the top `eliteCount` players by standings become elite
// (in rank order); everyone else is a sub, also in rank order. Only players
// currently on the roster are placed.
export function generateEliteLineup(
  standings: StandingsRow[],
  rosterProfileIds: string[],
  eliteCount: number
): { elite: string[]; subs: string[] } {
  const onRoster = new Set(rosterProfileIds);
  const ranked = standings.filter((r) => onRoster.has(r.profileId)).map((r) => r.profileId);
  return { elite: ranked.slice(0, eliteCount), subs: ranked.slice(eliteCount) };
}
