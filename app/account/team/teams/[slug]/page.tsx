import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Swords, Trophy, Users } from "lucide-react";

import { loadTeamContext } from "@/app/account/team/data";
import { Button } from "@/components/ui/button";
import { EmptyState, KpiCard, KpiGrid, Panel } from "@/components/dashboard/erp";
import { DateRange, LeagueStatusBadge, PlayerCell, RoleBadge } from "@/components/dashboard/team/team-ui";
import { getTeamLeagues, getTeamMembers } from "@/lib/teams/queries";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { team } = await loadTeamContext(slug);
  return { title: team.name, robots: { index: false, follow: false } };
}

export default async function TeamOverviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { team, isManager } = await loadTeamContext(slug);
  const [members, leagues] = await Promise.all([getTeamMembers(team.id), getTeamLeagues(team.id)]);

  const activeLeagues = leagues.filter((l) => l.status === "active").length;
  const totalMatches = leagues.reduce((sum, l) => sum + l.matchCount, 0);
  const base = `/account/team/teams/${team.slug}`;

  return (
    <div className="space-y-5">
      {team.description ? <p className="max-w-3xl text-[13px] text-on-surface/65">{team.description}</p> : null}

      <KpiGrid>
        <KpiCard label="Members" value={members.length} icon={Users} href={`${base}/members`} />
        <KpiCard label="Leagues" value={leagues.length} icon={Trophy} href={`${base}/leagues`} />
        <KpiCard label="Active leagues" value={activeLeagues} emphasis={activeLeagues > 0} />
        <KpiCard label="League matches" value={totalMatches} icon={Swords} />
      </KpiGrid>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Leagues"
          icon={Trophy}
          action={
            isManager ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`${base}/leagues/new`}>
                  <Plus /> New league
                </Link>
              </Button>
            ) : undefined
          }
          bodyClassName="p-0"
        >
          {leagues.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={Trophy}
                title="No leagues yet"
                description={isManager ? "Add a league to set the roster, log matches and track standings." : "The captain hasn't added a league yet."}
              />
            </div>
          ) : (
            <ul className="divide-y divide-outline-variant/15">
              {leagues.map((l) => (
                <li key={l.id}>
                  <Link href={`${base}/leagues/${l.id}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-container/50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{l.name}</p>
                      <p className="text-xs text-on-surface/45">
                        <DateRange start={l.start_date} end={l.end_date} /> · {l.elite_count} elite · {l.rosterCount} on roster ·{" "}
                        {l.matchCount} match{l.matchCount === 1 ? "" : "es"}
                      </p>
                    </div>
                    <LeagueStatusBadge status={l.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Members" icon={Users} meta={members.length} action={{ href: `${base}/members`, label: "Manage" }} bodyClassName="p-0">
          <ul className="divide-y divide-outline-variant/15">
            {members.slice(0, 8).map((m) => (
              <li key={m.profile.id} className="flex items-center justify-between gap-3 px-4 py-2">
                <PlayerCell profile={m.profile} />
                <RoleBadge role={m.role} />
              </li>
            ))}
          </ul>
          {members.length > 8 ? (
            <Link href={`${base}/members`} className="block border-t border-outline-variant/15 px-4 py-2 text-xs text-on-surface/55 hover:text-on-surface">
              +{members.length - 8} more
            </Link>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
