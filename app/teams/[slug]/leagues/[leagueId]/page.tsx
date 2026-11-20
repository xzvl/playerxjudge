import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Crown, ListOrdered, Swords, Users } from "lucide-react";

import { Panel } from "@/components/dashboard/erp";
import { MatchHistory } from "@/components/dashboard/team/MatchHistory";
import { StandingsTable } from "@/components/dashboard/team/StandingsTable";
import { DateRange, LeagueStatusBadge, PlayerCell, TeamLogo } from "@/components/dashboard/team/team-ui";
import { getLeagueView } from "@/lib/teams/league-view";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { getLeague, getMyTeamRole, getTeamBySlug, leagueStatus } from "@/lib/teams/queries";

type Params = Promise<{ slug: string; leagueId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, leagueId } = await params;
  const team = await getTeamBySlug(slug);
  const league = team ? await getLeague(team.id, leagueId) : null;
  if (!team || !league) return { title: "League not found" };
  return { title: `${league.name} · ${team.name}`, description: `${team.name}'s lineup, standings and match history in ${league.name}.` };
}

export default async function PublicLeaguePage({ params, searchParams }: { params: Params; searchParams: Promise<{ player?: string }> }) {
  const { slug, leagueId } = await params;
  const { player } = await searchParams;
  const team = await getTeamBySlug(slug);
  if (!team) notFound();

  // Members-only: team members (any role, captain and sub-captain included)
  // and the owner. Everyone else goes back to the public team page.
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectTo=/teams/${slug}/leagues/${leagueId}`);
  const role = await getMyTeamRole(team.id, user.id);
  if (!role && team.owner_id !== user.id) redirect(`/teams/${slug}`);

  const league = await getLeague(team.id, leagueId);
  if (!league) notFound();

  const view = await getLeagueView(league);
  const statsById = new Map(view.standings.map((r) => [r.profileId, r]));
  const playerFilter = player && view.profiles.has(player) ? player : null;
  const approved = view.matches.filter((m) => m.status === "approved");
  const matches = playerFilter ? approved.filter((m) => m.player.id === playerFilter) : approved;
  const base = `/teams/${team.slug}/leagues/${league.id}`;

  const lineupRow = (id: string, label: string) => {
    const profile = view.profiles.get(id);
    const s = statsById.get(id);
    if (!profile) return null;
    return (
      <li key={id} className="flex items-center gap-3 px-4 py-2">
        <span className="w-6 shrink-0 text-right text-xs tabular-nums text-on-surface/45">{label}</span>
        <div className="min-w-0 flex-1">
          <PlayerCell profile={profile} />
        </div>
        {s ? (
          <span className="shrink-0 text-xs tabular-nums text-on-surface/60">
            {s.wins}-{s.losses}-{s.ties} · <span className="font-medium text-on-surface">{s.score}</span>
          </span>
        ) : null}
      </li>
    );
  };

  return (
    <div className="app-shell bg-background">
      <div className="mx-auto max-w-6xl space-y-5 px-4 pb-16 pt-6 lg:px-6">
        <div>
          <Link href={`/teams/${team.slug}`} className="inline-flex items-center gap-1 text-xs text-on-surface/50 hover:text-on-surface">
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" /> {team.name}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3 border-b border-outline-variant/20 pb-4">
            <TeamLogo name={team.name} logoUrl={team.logo_url} size="lg" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="heading truncate">{league.name}</h1>
                <LeagueStatusBadge status={leagueStatus(league)} />
              </div>
              <p className="text-xs text-on-surface/50">
                {team.name} · <DateRange start={league.start_date} end={league.end_date} />
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr]">
          <div className="space-y-5">
            <Panel title="Elite" icon={Crown} meta={`${view.elite.length}/${league.elite_count}`} bodyClassName="p-0">
              {view.elite.length === 0 ? (
                <p className="px-4 py-4 text-[13px] text-on-surface/50">Lineup not set yet.</p>
              ) : (
                <ol className="divide-y divide-outline-variant/15">{view.elite.map((p, i) => lineupRow(p.id, String(i + 1)))}</ol>
              )}
            </Panel>
            <Panel title="Subs" icon={Users} meta={view.subs.length} bodyClassName="p-0">
              {view.subs.length === 0 ? (
                <p className="px-4 py-4 text-[13px] text-on-surface/50">No subs.</p>
              ) : (
                <ol className="divide-y divide-outline-variant/15">{view.subs.map((p, i) => lineupRow(p.id, `S${i + 1}`))}</ol>
              )}
            </Panel>
          </div>

          <Panel title="Standings" icon={ListOrdered} bodyClassName="p-0">
            <StandingsTable
              rows={view.standings}
              profiles={view.profiles}
              slotById={view.slotById}
              matchHistoryHref={(id) => `${base}?player=${id}#matches`}
            />
          </Panel>
        </div>

        <section id="matches" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="heading flex items-center gap-2">
              <Swords className="h-4 w-4 text-on-surface/45" aria-hidden="true" /> Match history
            </h2>
            {playerFilter ? (
              <p className="text-[13px] text-on-surface/55">
                {view.profiles.get(playerFilter)?.displayName}&apos;s matches ·{" "}
                <Link href={`${base}#matches`} className="text-on-surface hover:underline">
                  Show all
                </Link>
              </p>
            ) : null}
          </div>
          <MatchHistory matches={matches} />
        </section>
      </div>
    </div>
  );
}
