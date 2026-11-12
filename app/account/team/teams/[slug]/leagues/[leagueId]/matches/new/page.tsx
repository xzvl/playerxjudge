import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { loadLeagueContext } from "@/app/account/team/data";
import { EmptyState, Panel } from "@/components/dashboard/erp";
import { MatchForm } from "@/components/dashboard/team/MatchForm";
import { getBladeOptions, getLeagueRoster } from "@/lib/teams/queries";

export const metadata: Metadata = { title: "Add League Match", robots: { index: false, follow: false } };

export default async function NewLeagueMatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; leagueId: string }>;
  searchParams: Promise<{ player?: string }>;
}) {
  const { slug, leagueId } = await params;
  const { player } = await searchParams;
  const { team, league, userId, isManager } = await loadLeagueContext(slug, leagueId);
  const [roster, blades] = await Promise.all([getLeagueRoster(league.id), getBladeOptions()]);
  const leagueHref = `/account/team/teams/${team.slug}/leagues/${league.id}`;

  // Managers log for anyone on the roster; everyone else only for themselves.
  const players = (isManager ? roster : roster.filter((r) => r.profile.id === userId)).map((r) => r.profile);
  const defaultPlayerId = players.find((p) => p.id === player)?.id ?? players.find((p) => p.id === userId)?.id ?? players[0]?.id;

  return (
    <div className="space-y-4">
      <div>
        <Link href={`${leagueHref}?tab=matches`} className="inline-flex items-center gap-1 text-xs text-on-surface/50 hover:text-on-surface">
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {league.name}
        </Link>
        <h2 className="heading mt-1">Add match</h2>
      </div>
      {players.length === 0 ? (
        <EmptyState
          title="You're not on this league's roster"
          description="Ask your captain to add you to the roster, then log your matches here."
        />
      ) : (
        <Panel title="Match details" className="max-w-4xl">
          <MatchForm
            leagueId={league.id}
            teamSlug={team.slug}
            players={players}
            defaultPlayerId={defaultPlayerId}
            canPickAnyPlayer={isManager}
            blades={blades}
          />
        </Panel>
      )}
    </div>
  );
}
