import "server-only";

import { createClient } from "@/lib/supabase/server";
import { TEAM_ROLE_ORDER } from "@/lib/teams/constants";
import type {
  BattleOutcome,
  FinishType,
  LeagueRosterSlot,
  Team,
  TeamInvite,
  TeamLeague,
  TeamLeagueBattle,
  TeamLeagueMatch,
  TeamLeagueRosterEntry,
  TeamMember,
  TeamRole,
} from "@/lib/types/database";

// Read side of the Teams feature (app/account/team/*, app/teams/*). All
// tables are publicly readable, so the same queries back the public pages.
// Profiles and beyblades are batch-loaded by id rather than embedded:
// several team tables reference `profiles` twice (player + created_by,
// invitee + invited_by), which would need FK-name disambiguation per join.

type Client = Awaited<ReturnType<typeof createClient>>;

export interface ProfileSummary {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

async function loadProfiles(supabase: Client, ids: string[]): Promise<Map<string, ProfileSummary>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, ProfileSummary>();
  if (unique.length === 0) return map;
  const { data } = await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", unique);
  for (const p of (data ?? []) as { id: string; username: string; display_name: string; avatar_url: string | null }[]) {
    map.set(p.id, { id: p.id, username: p.username, displayName: p.display_name, avatarUrl: p.avatar_url });
  }
  return map;
}

function unknownProfile(id: string): ProfileSummary {
  return { id, username: "unknown", displayName: "Unknown player", avatarUrl: null };
}

// ------------------------------------------------------------------
// Teams
// ------------------------------------------------------------------

export interface TeamSummary extends Team {
  myRole: TeamRole | null;
  memberCount: number;
  leagueCount: number;
}

export async function getMyTeams(userId: string): Promise<TeamSummary[]> {
  const supabase = await createClient();
  const { data: memberships } = await supabase.from("team_members").select("team_id, role").eq("profile_id", userId);
  const roleByTeam = new Map(((memberships ?? []) as Pick<TeamMember, "team_id" | "role">[]).map((m) => [m.team_id, m.role]));
  const teamIds = [...roleByTeam.keys()];
  if (teamIds.length === 0) return [];

  const [{ data: teams }, { data: members }, { data: leagues }] = await Promise.all([
    supabase.from("teams").select("*").in("id", teamIds).order("name"),
    supabase.from("team_members").select("team_id").in("team_id", teamIds),
    supabase.from("team_leagues").select("team_id").in("team_id", teamIds),
  ]);

  const count = (rows: { team_id: string }[] | null, id: string) => (rows ?? []).filter((r) => r.team_id === id).length;
  return ((teams ?? []) as Team[]).map((t) => ({
    ...t,
    myRole: roleByTeam.get(t.id) ?? null,
    memberCount: count(members as { team_id: string }[] | null, t.id),
    leagueCount: count(leagues as { team_id: string }[] | null, t.id),
  }));
}

export async function getTeamBySlug(slug: string): Promise<Team | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("teams").select("*").eq("slug", slug).maybeSingle();
  return (data as Team | null) ?? null;
}

export async function getMyTeamRole(teamId: string, userId: string | null | undefined): Promise<TeamRole | null> {
  if (!userId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("profile_id", userId)
    .maybeSingle();
  return ((data as { role: TeamRole } | null)?.role ?? null) as TeamRole | null;
}

export interface TeamMemberRow {
  profile: ProfileSummary;
  role: TeamRole;
  joinedAt: string;
}

export async function getTeamMembers(teamId: string): Promise<TeamMemberRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("team_members").select("*").eq("team_id", teamId);
  const rows = (data ?? []) as TeamMember[];
  const profiles = await loadProfiles(supabase, rows.map((r) => r.profile_id));
  return rows
    .map((r) => ({ profile: profiles.get(r.profile_id) ?? unknownProfile(r.profile_id), role: r.role, joinedAt: r.joined_at }))
    .sort(
      (a, b) =>
        TEAM_ROLE_ORDER.indexOf(a.role) - TEAM_ROLE_ORDER.indexOf(b.role) ||
        a.profile.displayName.localeCompare(b.profile.displayName)
    );
}

// ------------------------------------------------------------------
// Invites
// ------------------------------------------------------------------

export interface TeamInviteRow {
  id: string;
  role: TeamRole;
  createdAt: string;
  invitee: ProfileSummary;
  invitedBy: ProfileSummary | null;
}

export async function getPendingTeamInvites(teamId: string): Promise<TeamInviteRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("team_invites")
    .select("*")
    .eq("team_id", teamId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as TeamInvite[];
  const profiles = await loadProfiles(supabase, rows.flatMap((r) => [r.invitee_id, r.invited_by ?? ""]));
  return rows.map((r) => ({
    id: r.id,
    role: r.role,
    createdAt: r.created_at,
    invitee: profiles.get(r.invitee_id) ?? unknownProfile(r.invitee_id),
    invitedBy: r.invited_by ? (profiles.get(r.invited_by) ?? null) : null,
  }));
}

export interface MyInviteRow {
  id: string;
  role: TeamRole;
  createdAt: string;
  team: Pick<Team, "id" | "slug" | "name" | "tag" | "logo_url">;
  invitedBy: ProfileSummary | null;
}

export async function getMyPendingInvites(userId: string): Promise<MyInviteRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("team_invites")
    .select("*")
    .eq("invitee_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as TeamInvite[];
  if (rows.length === 0) return [];

  const [{ data: teams }, profiles] = await Promise.all([
    supabase.from("teams").select("id, slug, name, tag, logo_url").in("id", [...new Set(rows.map((r) => r.team_id))]),
    loadProfiles(supabase, rows.map((r) => r.invited_by ?? "")),
  ]);
  const teamById = new Map(((teams ?? []) as MyInviteRow["team"][]).map((t) => [t.id, t]));

  return rows
    .filter((r) => teamById.has(r.team_id))
    .map((r) => ({
      id: r.id,
      role: r.role,
      createdAt: r.created_at,
      team: teamById.get(r.team_id)!,
      invitedBy: r.invited_by ? (profiles.get(r.invited_by) ?? null) : null,
    }));
}

// ------------------------------------------------------------------
// Leagues
// ------------------------------------------------------------------

export type LeagueStatus = "upcoming" | "active" | "ended";

export function leagueStatus(league: Pick<TeamLeague, "start_date" | "end_date">, today = new Date()): LeagueStatus {
  const iso = today.toISOString().slice(0, 10);
  if (iso < league.start_date) return "upcoming";
  if (iso > league.end_date) return "ended";
  return "active";
}

export interface LeagueSummary extends TeamLeague {
  status: LeagueStatus;
  rosterCount: number;
  matchCount: number;
}

export async function getTeamLeagues(teamId: string): Promise<LeagueSummary[]> {
  return getLeaguesForTeams([teamId]);
}

// Leagues for several teams in one set of queries (the Team Dashboard
// overview lists every team's leagues; one call per team was an N+1).
export async function getLeaguesForTeams(teamIds: string[]): Promise<LeagueSummary[]> {
  if (teamIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("team_leagues").select("*").in("team_id", teamIds).order("start_date", { ascending: false });
  const leagues = (data ?? []) as TeamLeague[];
  if (leagues.length === 0) return [];

  const ids = leagues.map((l) => l.id);
  const [{ data: roster }, { data: matches }] = await Promise.all([
    supabase.from("team_league_roster").select("league_id").in("league_id", ids),
    supabase.from("team_league_matches").select("league_id").in("league_id", ids),
  ]);
  const count = (rows: { league_id: string }[] | null, id: string) => (rows ?? []).filter((r) => r.league_id === id).length;

  return leagues.map((l) => ({
    ...l,
    status: leagueStatus(l),
    rosterCount: count(roster as { league_id: string }[] | null, l.id),
    matchCount: count(matches as { league_id: string }[] | null, l.id),
  }));
}

export async function getLeague(teamId: string, leagueId: string): Promise<TeamLeague | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("team_leagues").select("*").eq("id", leagueId).eq("team_id", teamId).maybeSingle();
  return (data as TeamLeague | null) ?? null;
}

export interface RosterRow {
  profile: ProfileSummary;
  slot: LeagueRosterSlot;
  position: number;
}

export async function getLeagueRoster(leagueId: string): Promise<RosterRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("team_league_roster").select("*").eq("league_id", leagueId);
  const rows = (data ?? []) as TeamLeagueRosterEntry[];
  const profiles = await loadProfiles(supabase, rows.map((r) => r.profile_id));
  return rows
    .map((r) => ({ profile: profiles.get(r.profile_id) ?? unknownProfile(r.profile_id), slot: r.slot, position: r.position }))
    .sort((a, b) => (a.slot === b.slot ? a.position - b.position : a.slot === "elite" ? -1 : 1));
}

export interface BattleRow {
  battleNo: number;
  outcome: BattleOutcome;
  finish: FinishType;
  playerBeyblade: string | null;
  opponentBeyblade: string | null;
  playerBeybladeId: string | null;
  opponentBeybladeId: string | null;
}

export interface LeagueMatchRow {
  id: string;
  player: ProfileSummary;
  opponentName: string;
  opponentTeam: string | null;
  playerPoints: number;
  opponentPoints: number;
  playedOn: string;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  status: "pending" | "approved";
  battles: BattleRow[];
}

// Newest first.
export async function getLeagueMatches(leagueId: string, opts: { profileId?: string } = {}): Promise<LeagueMatchRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("team_league_matches")
    .select("*")
    .eq("league_id", leagueId)
    .order("played_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (opts.profileId) query = query.eq("profile_id", opts.profileId);
  const { data } = await query;
  const matches = (data ?? []) as TeamLeagueMatch[];
  if (matches.length === 0) return [];

  const { data: battleData } = await supabase
    .from("team_league_battles")
    .select("*")
    .in("match_id", matches.map((m) => m.id))
    .order("battle_no");
  const battles = (battleData ?? []) as TeamLeagueBattle[];

  const beybladeIds = [...new Set(battles.flatMap((b) => [b.player_beyblade_id, b.opponent_beyblade_id]).filter(Boolean))] as string[];
  const [profiles, beybladeNames] = await Promise.all([
    loadProfiles(supabase, matches.map((m) => m.profile_id)),
    (async () => {
      const map = new Map<string, string>();
      if (beybladeIds.length === 0) return map;
      const { data: bb } = await supabase.from("beyblades").select("id, name").in("id", beybladeIds);
      for (const b of (bb ?? []) as { id: string; name: string }[]) map.set(b.id, b.name);
      return map;
    })(),
  ]);

  return matches.map((m) => ({
    id: m.id,
    player: profiles.get(m.profile_id) ?? unknownProfile(m.profile_id),
    opponentName: m.opponent_name,
    opponentTeam: m.opponent_team,
    playerPoints: m.player_points,
    opponentPoints: m.opponent_points,
    playedOn: m.played_on,
    notes: m.notes,
    createdBy: m.created_by,
    createdAt: m.created_at,
    status: m.status ?? "approved",
    battles: battles
      .filter((b) => b.match_id === m.id)
      .map((b) => ({
        battleNo: b.battle_no,
        outcome: b.outcome,
        finish: b.finish,
        playerBeybladeId: b.player_beyblade_id,
        opponentBeybladeId: b.opponent_beyblade_id,
        playerBeyblade: b.player_beyblade_id ? (beybladeNames.get(b.player_beyblade_id) ?? null) : null,
        opponentBeyblade: b.opponent_beyblade_id ? (beybladeNames.get(b.opponent_beyblade_id) ?? null) : null,
      })),
  }));
}

export async function getLeagueMatch(leagueId: string, matchId: string): Promise<LeagueMatchRow | null> {
  const all = await getLeagueMatches(leagueId);
  return all.find((m) => m.id === matchId) ?? null;
}

export interface BeybladeOption {
  id: string;
  name: string;
}

// Whole-blade catalog entries for the battle pickers (a battle names the
// Beyblade by its Blade).
export async function getBladeOptions(): Promise<BeybladeOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("beyblades")
    .select("id, name")
    .in("category", ["blade", "ratchet_integrated_blade"])
    .order("name");
  return ((data ?? []) as BeybladeOption[]) ?? [];
}

// Every match this player has logged across all their teams' leagues,
// newest first, for the Team Dashboard overview.
export interface MyRecentMatch {
  id: string;
  leagueId: string;
  leagueName: string;
  teamSlug: string;
  teamName: string;
  opponentName: string;
  playerPoints: number;
  opponentPoints: number;
  playedOn: string;
}

export async function getMyRecentLeagueMatches(userId: string, limit = 8): Promise<{ recent: MyRecentMatch[]; totals: { played: number; wins: number; losses: number; ties: number } }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("team_league_matches")
    .select("id, league_id, opponent_name, player_points, opponent_points, played_on, created_at")
    .eq("profile_id", userId)
    .eq("status", "approved")
    .order("played_on", { ascending: false })
    .order("created_at", { ascending: false });
  const matches = (data ?? []) as Pick<
    TeamLeagueMatch,
    "id" | "league_id" | "opponent_name" | "player_points" | "opponent_points" | "played_on" | "created_at"
  >[];

  const totals = { played: matches.length, wins: 0, losses: 0, ties: 0 };
  for (const m of matches) {
    if (m.player_points > m.opponent_points) totals.wins += 1;
    else if (m.player_points < m.opponent_points) totals.losses += 1;
    else totals.ties += 1;
  }

  const recentRaw = matches.slice(0, limit);
  if (recentRaw.length === 0) return { recent: [], totals };

  const { data: leagues } = await supabase
    .from("team_leagues")
    .select("id, name, team_id")
    .in("id", [...new Set(recentRaw.map((m) => m.league_id))]);
  const leagueRows = (leagues ?? []) as Pick<TeamLeague, "id" | "name" | "team_id">[];
  const { data: teams } = await supabase
    .from("teams")
    .select("id, slug, name")
    .in("id", [...new Set(leagueRows.map((l) => l.team_id))]);
  const teamById = new Map(((teams ?? []) as Pick<Team, "id" | "slug" | "name">[]).map((t) => [t.id, t]));
  const leagueById = new Map(leagueRows.map((l) => [l.id, l]));

  const recent = recentRaw.flatMap((m) => {
    const league = leagueById.get(m.league_id);
    const team = league ? teamById.get(league.team_id) : undefined;
    if (!league || !team) return [];
    return [
      {
        id: m.id,
        leagueId: league.id,
        leagueName: league.name,
        teamSlug: team.slug,
        teamName: team.name,
        opponentName: m.opponent_name,
        playerPoints: m.player_points,
        opponentPoints: m.opponent_points,
        playedOn: m.played_on,
      },
    ];
  });

  return { recent, totals };
}
