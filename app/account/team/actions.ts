"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { computeLeagueStandings, generateEliteLineup } from "@/lib/teams/standings";
import { isTeamManagerRole } from "@/lib/teams/constants";
import {
  leagueMatchSchema,
  leagueSchema,
  MAX_TEAM_COVER_BYTES,
  MAX_TEAM_LOGO_BYTES,
  teamSchema,
  type LeagueInput,
  type LeagueMatchInput,
  type TeamInput,
} from "@/lib/validations/team";
import type { TeamLeague, TeamLeagueMatch, TeamRole } from "@/lib/types/database";
import { queueImageVariants } from "@/lib/images/optimize";

// Write side of the Teams feature. RLS (20250101000059_teams_and_leagues.sql)
// is the real boundary; the checks here exist to return a clear message
// instead of a bare policy violation, and to enforce the finer rules RLS
// leaves to the app (e.g. only the captain hands out sub-captain).

export interface TeamActionState {
  status: "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  // Present on create actions.
  id?: string;
  slug?: string;
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

const ok = (extra: Partial<TeamActionState> = {}): TeamActionState => ({ status: "success", ...extra });
const fail = (message: string, fieldErrors?: TeamActionState["fieldErrors"]): TeamActionState => ({
  status: "error",
  message,
  fieldErrors,
});

function revalidateTeams() {
  revalidatePath("/account/team", "layout");
  revalidatePath("/teams", "layout");
}

interface TeamContext {
  supabase: Supabase;
  userId: string;
  role: TeamRole | null;
  isOwner: boolean;
  // Owner or captain: the two who may appoint sub-captains and hand the
  // captain role on.
  isLead: boolean;
  isManager: boolean;
  team: { id: string; slug: string; owner_id: string };
}

async function teamContext(teamId: string): Promise<TeamContext | string> {
  const user = await getCurrentUser();
  if (!user) return "You need to be signed in.";

  const supabase = await createClient();
  const { data: team } = await supabase.from("teams").select("id, slug, owner_id").eq("id", teamId).maybeSingle();
  if (!team) return "Team not found.";

  const { data: member } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("profile_id", user.id)
    .maybeSingle();
  const role = ((member as { role: TeamRole } | null)?.role ?? null) as TeamRole | null;
  const t = team as TeamContext["team"];
  const isOwner = t.owner_id === user.id;

  return {
    supabase,
    userId: user.id,
    role,
    isOwner,
    isLead: isOwner || role === "captain",
    isManager: isOwner || isTeamManagerRole(role),
    team: t,
  };
}

async function managerContext(teamId: string): Promise<TeamContext | string> {
  const ctx = await teamContext(teamId);
  if (typeof ctx === "string") return ctx;
  if (!ctx.isManager) return "Only the captain or a sub-captain can do that.";
  return ctx;
}

async function leagueTeamId(supabase: Supabase, leagueId: string): Promise<string | null> {
  const { data } = await supabase.from("team_leagues").select("team_id").eq("id", leagueId).maybeSingle();
  return (data as { team_id: string } | null)?.team_id ?? null;
}

// ------------------------------------------------------------------
// Teams
// ------------------------------------------------------------------

export async function createTeam(input: TeamInput): Promise<TeamActionState> {
  const user = await getCurrentUser();
  if (!user) return fail("You need to be signed in.");

  const parsed = teamSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", parsed.error.flatten().fieldErrors);

  const supabase = await createClient();
  const { data: existing } = await supabase.from("teams").select("id").eq("slug", parsed.data.slug).maybeSingle();
  if (existing) return fail("That URL is taken.", { slug: ["That URL is taken"] });

  const { data, error } = await supabase
    .from("teams")
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      tag: parsed.data.tag ? parsed.data.tag.toUpperCase() : null,
      description: parsed.data.description || null,
      owner_id: user.id,
    })
    .select("id, slug")
    .single();
  if (error || !data) return fail(error?.message ?? "Couldn't create the team.");
  const team = data as { id: string; slug: string };

  const { error: memberError } = await supabase
    .from("team_members")
    .insert({ team_id: team.id, profile_id: user.id, role: "captain" });
  if (memberError) {
    await supabase.from("teams").delete().eq("id", team.id);
    return fail(memberError.message);
  }

  revalidateTeams();
  return ok({ id: team.id, slug: team.slug });
}

export async function updateTeam(teamId: string, input: TeamInput): Promise<TeamActionState> {
  const ctx = await managerContext(teamId);
  if (typeof ctx === "string") return fail(ctx);

  const parsed = teamSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", parsed.error.flatten().fieldErrors);

  if (parsed.data.slug !== ctx.team.slug) {
    const { data: taken } = await ctx.supabase.from("teams").select("id").eq("slug", parsed.data.slug).maybeSingle();
    if (taken) return fail("That URL is taken.", { slug: ["That URL is taken"] });
  }

  const { error } = await ctx.supabase
    .from("teams")
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
      tag: parsed.data.tag ? parsed.data.tag.toUpperCase() : null,
      description: parsed.data.description || null,
    })
    .eq("id", teamId);
  if (error) return fail(error.message);

  revalidateTeams();
  return ok({ slug: parsed.data.slug });
}

export async function deleteTeam(teamId: string): Promise<TeamActionState> {
  const ctx = await teamContext(teamId);
  if (typeof ctx === "string") return fail(ctx);
  if (!ctx.isOwner) return fail("Only the team owner can delete the team.");

  await ctx.supabase.storage.from("team-images").remove([`${teamId}/logo.webp`, `${teamId}/cover.webp`]);
  const { error } = await ctx.supabase.from("teams").delete().eq("id", teamId);
  if (error) return fail(error.message);

  revalidateTeams();
  return ok();
}

export type TeamImageKind = "logo" | "cover";

export async function uploadTeamImage(teamId: string, kind: TeamImageKind, formData: FormData): Promise<TeamActionState & { url?: string }> {
  const ctx = await managerContext(teamId);
  if (typeof ctx === "string") return fail(ctx);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("No file provided.");
  if (file.type !== "image/webp") return fail("Image must be converted to WebP before upload.");
  if (file.size > (kind === "logo" ? MAX_TEAM_LOGO_BYTES : MAX_TEAM_COVER_BYTES)) return fail("Image is too large.");

  const path = `${teamId}/${kind}.webp`;
  const { error: uploadError } = await ctx.supabase.storage
    .from("team-images")
    .upload(path, file, { upsert: true, contentType: "image/webp" });
  if (uploadError) return fail(uploadError.message);
  queueImageVariants("team-images", path);

  const { data } = ctx.supabase.storage.from("team-images").getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;
  const { error } = await ctx.supabase
    .from("teams")
    .update(kind === "logo" ? { logo_url: url } : { cover_url: url })
    .eq("id", teamId);
  if (error) return fail(error.message);

  revalidateTeams();
  return { ...ok(), url };
}

export async function removeTeamImage(teamId: string, kind: TeamImageKind): Promise<TeamActionState> {
  const ctx = await managerContext(teamId);
  if (typeof ctx === "string") return fail(ctx);

  await ctx.supabase.storage.from("team-images").remove([`${teamId}/${kind}.webp`]);
  const { error } = await ctx.supabase
    .from("teams")
    .update(kind === "logo" ? { logo_url: null } : { cover_url: null })
    .eq("id", teamId);
  if (error) return fail(error.message);

  revalidateTeams();
  return ok();
}

// ------------------------------------------------------------------
// Members and invites
// ------------------------------------------------------------------

export interface InviteCandidate {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export async function searchPlayersToInvite(teamId: string, query: string): Promise<InviteCandidate[]> {
  const ctx = await managerContext(teamId);
  if (typeof ctx === "string") return [];

  // Only characters that can appear in a username/display name search; this
  // also keeps PostgREST's `or()` filter syntax (commas, parens) out.
  const q = query.trim().replace(/[^\p{L}\p{N}_ .-]/gu, "").slice(0, 40);
  if (q.length < 2) return [];

  const [{ data: profiles }, { data: members }, { data: invites }] = await Promise.all([
    ctx.supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .eq("is_banned", false)
      .limit(12),
    ctx.supabase.from("team_members").select("profile_id").eq("team_id", teamId),
    ctx.supabase.from("team_invites").select("invitee_id").eq("team_id", teamId).eq("status", "pending"),
  ]);

  const excluded = new Set([
    ...((members ?? []) as { profile_id: string }[]).map((m) => m.profile_id),
    ...((invites ?? []) as { invitee_id: string }[]).map((i) => i.invitee_id),
  ]);

  return ((profiles ?? []) as { id: string; username: string; display_name: string; avatar_url: string | null }[])
    .filter((p) => !excluded.has(p.id))
    .slice(0, 8)
    .map((p) => ({ id: p.id, username: p.username, displayName: p.display_name, avatarUrl: p.avatar_url }));
}

export async function inviteToTeam(teamId: string, profileId: string, role: TeamRole = "member"): Promise<TeamActionState> {
  const ctx = await managerContext(teamId);
  if (typeof ctx === "string") return fail(ctx);
  if (role === "captain") return fail("Invite them first, then transfer captaincy.");
  if (role === "sub_captain" && !ctx.isLead) return fail("Only the owner or captain can appoint sub-captains.");

  const { data: member } = await ctx.supabase
    .from("team_members")
    .select("profile_id")
    .eq("team_id", teamId)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (member) return fail("They're already on the team.");

  const { error } = await ctx.supabase
    .from("team_invites")
    .insert({ team_id: teamId, invitee_id: profileId, invited_by: ctx.userId, role });
  if (error) {
    return fail(error.code === "23505" ? "They already have a pending invite." : error.message);
  }

  const { data: team } = await ctx.supabase.from("teams").select("name").eq("id", teamId).maybeSingle();
  // Best effort: the invite itself is what matters.
  await ctx.supabase.from("notifications").insert({
    profile_id: profileId,
    type: "team_invite",
    title: `You're invited to join ${(team as { name: string } | null)?.name ?? "a team"}`,
    body: "Accept or decline from your Team Dashboard.",
    link: "/account/team/dashboard",
  });

  revalidateTeams();
  return ok();
}

export async function cancelTeamInvite(teamId: string, inviteId: string): Promise<TeamActionState> {
  const ctx = await managerContext(teamId);
  if (typeof ctx === "string") return fail(ctx);

  const { error } = await ctx.supabase
    .from("team_invites")
    .update({ status: "cancelled", responded_at: new Date().toISOString() })
    .eq("id", inviteId)
    .eq("team_id", teamId)
    .eq("status", "pending");
  if (error) return fail(error.message);

  revalidateTeams();
  return ok();
}

export async function respondToTeamInvite(inviteId: string, accept: boolean): Promise<TeamActionState> {
  const user = await getCurrentUser();
  if (!user) return fail("You need to be signed in.");

  const supabase = await createClient();
  if (accept) {
    const { data, error } = await supabase.rpc("accept_team_invite", { target_invite_id: inviteId });
    if (error) return fail(error.message);
    const { data: team } = await supabase.from("teams").select("slug").eq("id", data as string).maybeSingle();
    revalidateTeams();
    return ok({ slug: (team as { slug: string } | null)?.slug });
  }

  const { error } = await supabase.rpc("decline_team_invite", { target_invite_id: inviteId });
  if (error) return fail(error.message);
  revalidateTeams();
  return ok();
}

export async function setMemberRole(teamId: string, profileId: string, role: TeamRole): Promise<TeamActionState> {
  const ctx = await managerContext(teamId);
  if (typeof ctx === "string") return fail(ctx);
  if (role === "captain") return fail("Use “Make captain” to transfer captaincy.");

  const { data: target } = await ctx.supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("profile_id", profileId)
    .maybeSingle();
  const current = (target as { role: TeamRole } | null)?.role;
  if (!current) return fail("They're not on the team.");
  // Only the owner may demote the captain directly; others transfer captaincy.
  if (current === "captain" && !ctx.isOwner) return fail("Transfer captaincy to someone else first.");
  if ((role === "sub_captain" || current === "sub_captain") && !ctx.isLead) {
    return fail("Only the owner or captain can appoint or change sub-captains.");
  }

  const { error } = await ctx.supabase.from("team_members").update({ role }).eq("team_id", teamId).eq("profile_id", profileId);
  if (error) return fail(error.message);

  revalidateTeams();
  return ok();
}

export async function transferCaptaincy(teamId: string, profileId: string): Promise<TeamActionState> {
  const ctx = await teamContext(teamId);
  if (typeof ctx === "string") return fail(ctx);
  if (!ctx.isLead) return fail("Only the owner or captain can transfer captaincy.");

  const { error } = await ctx.supabase.rpc("transfer_team_captaincy", { target_team_id: teamId, new_captain_id: profileId });
  if (error) return fail(error.message);

  revalidateTeams();
  return ok();
}

// Moves teams.owner_id to another member. Their team role doesn't change;
// the old owner keeps whatever role they hold.
export async function transferOwnership(teamId: string, profileId: string): Promise<TeamActionState> {
  const ctx = await teamContext(teamId);
  if (typeof ctx === "string") return fail(ctx);
  if (!ctx.isOwner) return fail("Only the team owner can transfer ownership.");
  if (profileId === ctx.userId) return fail("You already own this team.");

  const { error } = await ctx.supabase.rpc("transfer_team_ownership", { target_team_id: teamId, new_owner_id: profileId });
  if (error) return fail(error.message);

  revalidateTeams();
  return ok();
}

export async function removeTeamMember(teamId: string, profileId: string): Promise<TeamActionState> {
  const ctx = await teamContext(teamId);
  if (typeof ctx === "string") return fail(ctx);

  const leaving = profileId === ctx.userId;
  if (!leaving && !ctx.isManager) return fail("Only the captain or a sub-captain can remove members.");

  const { data: target } = await ctx.supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("profile_id", profileId)
    .maybeSingle();
  const role = (target as { role: TeamRole } | null)?.role;
  if (!role) return fail("They're not on the team.");
  // The owner may remove anyone, including the captain and their own row.
  // Everyone else can't touch the owner or the captain.
  if (!ctx.isOwner) {
    if (profileId === ctx.team.owner_id) {
      return fail(leaving ? "Transfer ownership before leaving, or delete the team." : "The team owner can't be removed.");
    }
    if (role === "captain") {
      return fail(leaving ? "Transfer captaincy before leaving, or delete the team." : "The captain can't be removed.");
    }
  }
  if (!leaving && role === "sub_captain" && !ctx.isLead) return fail("Only the owner or captain can remove a sub-captain.");

  const { error } = await ctx.supabase.from("team_members").delete().eq("team_id", teamId).eq("profile_id", profileId);
  if (error) return fail(error.message);

  // Off the team means off every league roster too (their logged matches stay).
  const { data: leagues } = await ctx.supabase.from("team_leagues").select("id").eq("team_id", teamId);
  const leagueIds = ((leagues ?? []) as { id: string }[]).map((l) => l.id);
  if (leagueIds.length > 0) {
    await ctx.supabase.from("team_league_roster").delete().eq("profile_id", profileId).in("league_id", leagueIds);
  }

  revalidateTeams();
  return ok();
}

// ------------------------------------------------------------------
// Leagues
// ------------------------------------------------------------------

export async function createLeague(teamId: string, input: LeagueInput): Promise<TeamActionState> {
  const ctx = await managerContext(teamId);
  if (typeof ctx === "string") return fail(ctx);

  const parsed = leagueSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", parsed.error.flatten().fieldErrors);

  const { data, error } = await ctx.supabase
    .from("team_leagues")
    .insert({
      team_id: teamId,
      name: parsed.data.name,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
      elite_count: parsed.data.eliteCount,
    })
    .select("id")
    .single();
  if (error || !data) return fail(error?.message ?? "Couldn't create the league.");

  revalidateTeams();
  return ok({ id: (data as { id: string }).id, slug: ctx.team.slug });
}

export async function updateLeague(leagueId: string, input: LeagueInput): Promise<TeamActionState> {
  const supabase = await createClient();
  const teamId = await leagueTeamId(supabase, leagueId);
  if (!teamId) return fail("League not found.");
  const ctx = await managerContext(teamId);
  if (typeof ctx === "string") return fail(ctx);

  const parsed = leagueSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", parsed.error.flatten().fieldErrors);

  const { error } = await ctx.supabase
    .from("team_leagues")
    .update({
      name: parsed.data.name,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
      elite_count: parsed.data.eliteCount,
    })
    .eq("id", leagueId);
  if (error) return fail(error.message);

  // Shrinking the elite count moves the overflow to the top of the bench.
  await normalizeRoster(ctx.supabase, leagueId, parsed.data.eliteCount);

  revalidateTeams();
  return ok();
}

export async function deleteLeague(leagueId: string): Promise<TeamActionState> {
  const supabase = await createClient();
  const teamId = await leagueTeamId(supabase, leagueId);
  if (!teamId) return fail("League not found.");
  const ctx = await managerContext(teamId);
  if (typeof ctx === "string") return fail(ctx);

  const { error } = await ctx.supabase.from("team_leagues").delete().eq("id", leagueId);
  if (error) return fail(error.message);

  revalidateTeams();
  return ok({ slug: ctx.team.slug });
}

// ------------------------------------------------------------------
// League roster
// ------------------------------------------------------------------

async function writeRosterOrder(supabase: Supabase, leagueId: string, elite: string[], subs: string[]) {
  const updates = [
    ...elite.map((profileId, position) => ({ profileId, slot: "elite" as const, position })),
    ...subs.map((profileId, position) => ({ profileId, slot: "sub" as const, position })),
  ];
  for (const u of updates) {
    const { error } = await supabase
      .from("team_league_roster")
      .update({ slot: u.slot, position: u.position })
      .eq("league_id", leagueId)
      .eq("profile_id", u.profileId);
    if (error) return error.message;
  }
  return null;
}

// Re-packs positions (0..n) and enforces the elite cap, keeping order.
async function normalizeRoster(supabase: Supabase, leagueId: string, eliteCount: number) {
  const { data } = await supabase.from("team_league_roster").select("profile_id, slot, position").eq("league_id", leagueId);
  const rows = (data ?? []) as { profile_id: string; slot: "elite" | "sub"; position: number }[];
  const elite = rows.filter((r) => r.slot === "elite").sort((a, b) => a.position - b.position).map((r) => r.profile_id);
  const subs = rows.filter((r) => r.slot === "sub").sort((a, b) => a.position - b.position).map((r) => r.profile_id);
  const overflow = elite.splice(eliteCount);
  return writeRosterOrder(supabase, leagueId, elite, [...overflow, ...subs]);
}

async function leagueManagerContext(leagueId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("team_leagues").select("*").eq("id", leagueId).maybeSingle();
  const league = data as TeamLeague | null;
  if (!league) return "League not found.";
  const ctx = await managerContext(league.team_id);
  if (typeof ctx === "string") return ctx;
  return { ...ctx, league };
}

export async function addToLeagueRoster(leagueId: string, profileIds: string[]): Promise<TeamActionState> {
  const ctx = await leagueManagerContext(leagueId);
  if (typeof ctx === "string") return fail(ctx);
  if (profileIds.length === 0) return fail("Pick at least one player.");

  const { data: members } = await ctx.supabase.from("team_members").select("profile_id").eq("team_id", ctx.league.team_id);
  const memberIds = new Set(((members ?? []) as { profile_id: string }[]).map((m) => m.profile_id));
  const { data: roster } = await ctx.supabase.from("team_league_roster").select("profile_id, slot").eq("league_id", leagueId);
  const rosterRows = (roster ?? []) as { profile_id: string; slot: "elite" | "sub" }[];
  const onRoster = new Set(rosterRows.map((r) => r.profile_id));

  const toAdd = profileIds.filter((id) => memberIds.has(id) && !onRoster.has(id));
  if (toAdd.length === 0) return fail("Those players are already on the roster.");

  // New players fill open elite spots first, then join the end of the bench.
  let eliteFilled = rosterRows.filter((r) => r.slot === "elite").length;
  let subCount = rosterRows.filter((r) => r.slot === "sub").length;
  const rows = toAdd.map((profileId) => {
    if (eliteFilled < ctx.league.elite_count) {
      return { league_id: leagueId, profile_id: profileId, slot: "elite" as const, position: eliteFilled++ };
    }
    return { league_id: leagueId, profile_id: profileId, slot: "sub" as const, position: subCount++ };
  });

  const { error } = await ctx.supabase.from("team_league_roster").insert(rows);
  if (error) return fail(error.message);

  revalidateTeams();
  return ok();
}

export async function removeFromLeagueRoster(leagueId: string, profileId: string): Promise<TeamActionState> {
  const ctx = await leagueManagerContext(leagueId);
  if (typeof ctx === "string") return fail(ctx);

  const { error } = await ctx.supabase.from("team_league_roster").delete().eq("league_id", leagueId).eq("profile_id", profileId);
  if (error) return fail(error.message);
  await normalizeRoster(ctx.supabase, leagueId, ctx.league.elite_count);

  revalidateTeams();
  return ok();
}

export async function saveRosterOrder(leagueId: string, elite: string[], subs: string[]): Promise<TeamActionState> {
  const ctx = await leagueManagerContext(leagueId);
  if (typeof ctx === "string") return fail(ctx);
  if (elite.length > ctx.league.elite_count) return fail(`This league fields ${ctx.league.elite_count} elite players.`);

  const { data } = await ctx.supabase.from("team_league_roster").select("profile_id").eq("league_id", leagueId);
  const current = new Set(((data ?? []) as { profile_id: string }[]).map((r) => r.profile_id));
  const submitted = [...elite, ...subs];
  if (submitted.length !== current.size || new Set(submitted).size !== submitted.length || submitted.some((id) => !current.has(id))) {
    return fail("The roster changed in the meantime. Refresh and try again.");
  }

  const error = await writeRosterOrder(ctx.supabase, leagueId, elite, subs);
  if (error) return fail(error);

  revalidateTeams();
  return ok();
}

export async function generateLeagueElite(leagueId: string): Promise<TeamActionState> {
  const ctx = await leagueManagerContext(leagueId);
  if (typeof ctx === "string") return fail(ctx);

  const [{ data: roster }, { data: matches }] = await Promise.all([
    ctx.supabase.from("team_league_roster").select("profile_id, slot, position").eq("league_id", leagueId),
    ctx.supabase
      .from("team_league_matches")
      .select("id, profile_id, opponent_name, player_points, opponent_points")
      .eq("league_id", leagueId)
      .eq("status", "approved")
      .order("played_on")
      .order("created_at"),
  ]);
  const rosterRows = (roster ?? []) as { profile_id: string; slot: "elite" | "sub"; position: number }[];
  if (rosterRows.length === 0) return fail("Add players to the roster first.");

  // Current order is the final tiebreak, so a full tie keeps today's lineup.
  const currentOrder = [...rosterRows]
    .sort((a, b) => (a.slot === b.slot ? a.position - b.position : a.slot === "elite" ? -1 : 1))
    .map((r) => r.profile_id);
  const standings = computeLeagueStandings(
    currentOrder.map((profileId, i) => ({ profileId, name: String(i).padStart(4, "0") })),
    ((matches ?? []) as Pick<TeamLeagueMatch, "id" | "profile_id" | "opponent_name" | "player_points" | "opponent_points">[]).map(
      (m) => ({
        id: m.id,
        profileId: m.profile_id,
        opponentName: m.opponent_name,
        playerPoints: m.player_points,
        opponentPoints: m.opponent_points,
      })
    )
  );
  const { elite, subs } = generateEliteLineup(standings, currentOrder, ctx.league.elite_count);

  const error = await writeRosterOrder(ctx.supabase, leagueId, elite, subs);
  if (error) return fail(error);

  revalidateTeams();
  return ok();
}

// ------------------------------------------------------------------
// League matches
// ------------------------------------------------------------------

async function matchContext(leagueId: string, playerId: string, { requireRoster = true } = {}) {
  const user = await getCurrentUser();
  if (!user) return "You need to be signed in.";
  const supabase = await createClient();
  const { data } = await supabase.from("team_leagues").select("team_id").eq("id", leagueId).maybeSingle();
  const teamId = (data as { team_id: string } | null)?.team_id;
  if (!teamId) return "League not found.";

  const ctx = await teamContext(teamId);
  if (typeof ctx === "string") return ctx;
  if (!ctx.role && !ctx.isOwner) return "You're not on this team.";
  if (!ctx.isManager && playerId !== user.id) return "You can only log your own matches.";
  if (!requireRoster) return { ...ctx, userId: user.id };

  const { data: onRoster } = await supabase
    .from("team_league_roster")
    .select("profile_id")
    .eq("league_id", leagueId)
    .eq("profile_id", playerId)
    .maybeSingle();
  if (!onRoster) {
    return playerId === user.id
      ? "You're not on this league's roster yet. Ask your captain to add you."
      : "That player isn't on this league's roster.";
  }
  return { ...ctx, userId: user.id };
}

async function writeBattles(supabase: Supabase, matchId: string, battles: LeagueMatchInput["battles"]) {
  await supabase.from("team_league_battles").delete().eq("match_id", matchId);
  const list = battles ?? [];
  if (list.length === 0) return null;
  const { error } = await supabase.from("team_league_battles").insert(
    list.map((b, i) => ({
      match_id: matchId,
      battle_no: i + 1,
      outcome: b.outcome,
      finish: b.finish,
      player_beyblade_id: b.playerBeybladeId ?? null,
      opponent_beyblade_id: b.opponentBeybladeId ?? null,
    }))
  );
  return error?.message ?? null;
}

export async function createLeagueMatch(leagueId: string, input: LeagueMatchInput): Promise<TeamActionState> {
  const parsed = leagueMatchSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", parsed.error.flatten().fieldErrors);

  const ctx = await matchContext(leagueId, parsed.data.profileId);
  if (typeof ctx === "string") return fail(ctx);

  const { data, error } = await ctx.supabase
    .from("team_league_matches")
    .insert({
      league_id: leagueId,
      profile_id: parsed.data.profileId,
      opponent_name: parsed.data.opponentName,
      opponent_team: parsed.data.opponentTeam || null,
      player_points: parsed.data.playerPoints,
      opponent_points: parsed.data.opponentPoints,
      played_on: parsed.data.playedOn,
      notes: parsed.data.notes || null,
      created_by: ctx.userId,
      // Members/fillers need a manager's approval; managers' own are approved.
      status: ctx.isManager ? "approved" : "pending",
    })
    .select("id")
    .single();
  if (error || !data) return fail(error?.message ?? "Couldn't save the match.");
  const matchId = (data as { id: string }).id;

  const battleError = await writeBattles(ctx.supabase, matchId, parsed.data.battles);
  if (battleError) return fail(`Match saved, but its battles weren't: ${battleError}`);

  revalidateTeams();
  return ok({ id: matchId, slug: ctx.team.slug });
}

export async function updateLeagueMatch(leagueId: string, matchId: string, input: LeagueMatchInput): Promise<TeamActionState> {
  const parsed = leagueMatchSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", parsed.error.flatten().fieldErrors);

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("team_league_matches")
    .select("profile_id, created_by")
    .eq("id", matchId)
    .eq("league_id", leagueId)
    .maybeSingle();
  const row = existing as { profile_id: string; created_by: string | null } | null;
  if (!row) return fail("Match not found.");

  // Keeping the same player is fine even if they've since left the roster;
  // switching to a different player requires that player be on it.
  const ctx = await matchContext(leagueId, parsed.data.profileId, { requireRoster: parsed.data.profileId !== row.profile_id });
  if (typeof ctx === "string") return fail(ctx);
  if (!ctx.isManager && row.profile_id !== ctx.userId && row.created_by !== ctx.userId) {
    return fail("You can only edit your own matches.");
  }

  const { error } = await ctx.supabase
    .from("team_league_matches")
    .update({
      profile_id: parsed.data.profileId,
      opponent_name: parsed.data.opponentName,
      opponent_team: parsed.data.opponentTeam || null,
      player_points: parsed.data.playerPoints,
      opponent_points: parsed.data.opponentPoints,
      played_on: parsed.data.playedOn,
      notes: parsed.data.notes || null,
      // A member's edit needs re-approval; a manager's edit is approved.
      status: ctx.isManager ? "approved" : "pending",
    })
    .eq("id", matchId);
  if (error) return fail(error.message);

  const battleError = await writeBattles(ctx.supabase, matchId, parsed.data.battles);
  if (battleError) return fail(`Match saved, but its battles weren't: ${battleError}`);

  revalidateTeams();
  return ok({ id: matchId, slug: ctx.team.slug });
}

export async function approveLeagueMatch(matchId: string): Promise<TeamActionState> {
  const supabase = await createClient();
  const { data } = await supabase.from("team_league_matches").select("league_id").eq("id", matchId).maybeSingle();
  const leagueId = (data as { league_id: string } | null)?.league_id;
  if (!leagueId) return fail("Match not found.");

  const ctx = await leagueManagerContext(leagueId);
  if (typeof ctx === "string") return fail(ctx);

  // The guard trigger stamps approved_by / approved_at.
  const { error } = await ctx.supabase.from("team_league_matches").update({ status: "approved" }).eq("id", matchId);
  if (error) return fail(error.message);

  revalidateTeams();
  return ok();
}

export async function deleteLeagueMatch(matchId: string): Promise<TeamActionState> {
  const user = await getCurrentUser();
  if (!user) return fail("You need to be signed in.");
  const supabase = await createClient();

  // RLS (can_edit_league_match) decides; `count` tells us if it allowed it.
  const { error, count } = await supabase.from("team_league_matches").delete({ count: "exact" }).eq("id", matchId);
  if (error) return fail(error.message);
  if (!count) return fail("You can't delete that match.");

  revalidateTeams();
  return ok();
}
