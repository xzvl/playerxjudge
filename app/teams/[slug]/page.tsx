import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Settings, Trophy, Users } from "lucide-react";

import { Panel } from "@/components/dashboard/erp";
import { DateRange, LeagueStatusBadge, PlayerCell, RoleBadge, TeamLogo } from "@/components/dashboard/team/team-ui";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { TEAM_ROLE_LABEL, TEAM_ROLE_ORDER } from "@/lib/teams/constants";
import { getMyTeamRole, getTeamBySlug, getTeamLeagues, getTeamMembers } from "@/lib/teams/queries";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const team = await getTeamBySlug(slug);
  if (!team) return { title: "Team not found" };
  return {
    title: team.name,
    description: team.description ?? `${team.name} on PlayerXJudge: roster, leagues and standings.`,
    openGraph: team.cover_url ? { images: [team.cover_url] } : undefined,
  };
}

export default async function PublicTeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const team = await getTeamBySlug(slug);
  if (!team) notFound();

  const user = await getCurrentUser();
  const [members, allLeagues, viewerRole] = await Promise.all([
    getTeamMembers(team.id),
    getTeamLeagues(team.id),
    getMyTeamRole(team.id, user?.id),
  ]);
  // Earliest start date first (the shared query returns newest first).
  const leagues = [...allLeagues].sort((a, b) => a.start_date.localeCompare(b.start_date));

  return (
    <div className="app-shell bg-background">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 lg:px-6">
        <div className="overflow-hidden rounded-lg border border-outline-variant/25 bg-surface-container-low">
          <div className="h-32 bg-surface-container sm:h-48">
            {team.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={team.cover_url} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3 px-4 pb-4 sm:px-6">
            <div className="flex min-w-0 items-end gap-4">
              <TeamLogo name={team.name} logoUrl={team.logo_url} size="xl" className="-mt-10 border-4 border-surface-container-low bg-surface-container" />
              <div className="min-w-0 pb-1">
                <h1 className="heading truncate text-xl">
                  {team.name}
                  {team.tag ? <span className="ml-2 font-mono text-sm font-normal text-on-surface/45">{team.tag}</span> : null}
                </h1>
                <p className="text-xs text-on-surface/50">
                  {members.length} member{members.length === 1 ? "" : "s"} · {leagues.length} league{leagues.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            {viewerRole ? (
              <Link
                href={`/account/team/teams/${team.slug}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-outline-variant/35 px-3 text-[13px] font-medium transition-colors hover:bg-surface-container"
              >
                <Settings className="h-3.5 w-3.5" aria-hidden="true" /> Manage team
              </Link>
            ) : null}
          </div>
          {team.description ? <p className="border-t border-outline-variant/15 px-4 py-3 text-[13px] text-on-surface/65 sm:px-6">{team.description}</p> : null}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <Panel title="Leagues" icon={Trophy} meta={leagues.length} bodyClassName="p-0">
            {leagues.length === 0 ? (
              <p className="px-4 py-4 text-[13px] text-on-surface/50">No leagues yet.</p>
            ) : (
              <ul className="divide-y divide-outline-variant/15">
                {leagues.map((l) => (
                  <li key={l.id}>
                    <Link href={`/teams/${team.slug}/leagues/${l.id}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-container/50">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">{l.name}</p>
                        <p className="text-xs text-on-surface/45">
                          <DateRange start={l.start_date} end={l.end_date} /> · {l.matchCount} match{l.matchCount === 1 ? "" : "es"}
                        </p>
                      </div>
                      <LeagueStatusBadge status={l.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Roster" icon={Users} meta={members.length} bodyClassName="p-0">
            {TEAM_ROLE_ORDER.map((role) => {
              const group = members.filter((m) => m.role === role);
              if (group.length === 0) return null;
              return (
                <div key={role} className="border-b border-outline-variant/15 last:border-0">
                  <p className="px-4 pb-1 pt-3 text-xs font-medium text-on-surface/45">
                    {TEAM_ROLE_LABEL[role]}
                    {group.length > 1 ? "s" : ""}
                  </p>
                  <ul className="pb-2">
                    {group.map((m) => (
                      <li key={m.profile.id} className="flex items-center justify-between gap-3 px-4 py-1.5">
                        <PlayerCell profile={m.profile} />
                        {role === "captain" || role === "sub_captain" ? <RoleBadge role={role} /> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </Panel>
        </div>
      </div>
    </div>
  );
}
