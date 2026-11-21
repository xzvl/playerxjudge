import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { loadLeagueContext } from "@/app/account/team/data";
import { Panel } from "@/components/dashboard/erp";
import { MatchForm } from "@/components/dashboard/team/MatchForm";
import { getBladeOptions, getLeagueMatch, getLeagueRoster } from "@/lib/teams/queries";

export const metadata: Metadata = { title: "Edit League Match", robots: { index: false, follow: false } };

export default async function EditLeagueMatchPage({
  params,
}: {
  params: Promise<{ slug: string; leagueId: string; matchId: string }>;
}) {
  const { slug, leagueId, matchId } = await params;
  const [{ team, league, userId, isManager }, match, roster, blades] = await Promise.all([
    loadLeagueContext(slug, leagueId),
    getLeagueMatch(leagueId, matchId),
    getLeagueRoster(leagueId),
    getBladeOptions(),
  ]);
  if (!match) notFound();

  const leagueHref = `/account/team/teams/${team.slug}/leagues/${league.id}`;
  const canEdit = isManager || match.player.id === userId || match.createdBy === userId;
  if (!canEdit) redirect(`${leagueHref}?tab=matches`);

  // Keep the current player selectable even if they've since left the roster.
  const rosterPlayers = roster.map((r) => r.profile);
  const players = isManager
    ? rosterPlayers.some((p) => p.id === match.player.id)
      ? rosterPlayers
      : [match.player, ...rosterPlayers]
    : [match.player];

  return (
    <div className="space-y-4">
      <div>
        <Link href={`${leagueHref}?tab=matches`} className="inline-flex items-center gap-1 text-xs text-on-surface/50 hover:text-on-surface">
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {league.name}
        </Link>
        <h2 className="heading mt-1">Edit match</h2>
      </div>
      <Panel title="Match details" className="max-w-4xl">
        <MatchForm
          leagueId={league.id}
          teamSlug={team.slug}
          players={players}
          canPickAnyPlayer={isManager}
          blades={blades}
          match={match}
        />
      </Panel>
    </div>
  );
}
