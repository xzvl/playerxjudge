import "server-only";

import { getLeagueMatches, getLeagueRoster, type LeagueMatchRow, type ProfileSummary, type RosterRow } from "@/lib/teams/queries";
import { computeLeagueStandings, type StandingsRow } from "@/lib/teams/standings";
import type { TeamLeague } from "@/lib/types/database";

export interface LeagueView {
  roster: RosterRow[];
  elite: ProfileSummary[];
  subs: ProfileSummary[];
  matches: LeagueMatchRow[]; // newest first
  standings: StandingsRow[];
  profiles: Map<string, ProfileSummary>;
  slotById: Record<string, "elite" | "sub">;
}

// Everything a league page shows, from one roster read and one match read.
export async function getLeagueView(league: TeamLeague): Promise<LeagueView> {
  const [roster, matches] = await Promise.all([getLeagueRoster(league.id), getLeagueMatches(league.id)]);

  const profiles = new Map<string, ProfileSummary>();
  for (const r of roster) profiles.set(r.profile.id, r.profile);
  for (const m of matches) if (!profiles.has(m.player.id)) profiles.set(m.player.id, m.player);

  // Standings want oldest-first so each player's form reads left to right.
  // Only approved matches count.
  const chronological = matches.filter((m) => m.status === "approved").reverse();
  const standings = computeLeagueStandings(
    roster.map((r) => ({ profileId: r.profile.id, name: r.profile.displayName })),
    chronological.map((m) => ({
      id: m.id,
      profileId: m.player.id,
      opponentName: m.opponentName,
      playerPoints: m.playerPoints,
      opponentPoints: m.opponentPoints,
    }))
  ).map((row) => ({ ...row, name: profiles.get(row.profileId)?.displayName ?? row.name }));

  const slotById: Record<string, "elite" | "sub"> = {};
  for (const r of roster) slotById[r.profile.id] = r.slot;

  return {
    roster,
    elite: roster.filter((r) => r.slot === "elite").map((r) => r.profile),
    subs: roster.filter((r) => r.slot === "sub").map((r) => r.profile),
    matches,
    standings,
    profiles,
    slotById,
  };
}
