import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/supabase/get-user";
import { isTeamManagerRole } from "@/lib/teams/constants";
import { getLeague, getMyTeamRole, getTeamBySlug } from "@/lib/teams/queries";
import type { Team, TeamLeague, TeamRole } from "@/lib/types/database";

export interface TeamPageContext {
  team: Team;
  userId: string;
  role: TeamRole | null;
  isOwner: boolean;
  isManager: boolean;
}

// Deduped per request (layout + page both call it). Non-members get the
// public page instead of the management view.
export const loadTeamContext = cache(async (slug: string): Promise<TeamPageContext> => {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectTo=/account/team/teams/${slug}`);

  const team = await getTeamBySlug(slug);
  if (!team) notFound();

  const role = await getMyTeamRole(team.id, user.id);
  const isOwner = team.owner_id === user.id;
  if (!role && !isOwner) redirect(`/teams/${slug}`);

  return { team, userId: user.id, role, isOwner, isManager: isOwner || isTeamManagerRole(role) };
});

export const loadLeagueContext = cache(
  async (slug: string, leagueId: string): Promise<TeamPageContext & { league: TeamLeague }> => {
    const ctx = await loadTeamContext(slug);
    const league = await getLeague(ctx.team.id, leagueId);
    if (!league) notFound();
    return { ...ctx, league };
  }
);
