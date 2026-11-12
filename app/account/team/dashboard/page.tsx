import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarRange, Mail, Plus, Shield, Swords, Trophy, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState, KpiCard, KpiGrid, PageHeader, Panel } from "@/components/dashboard/erp";
import { MyInvitesList } from "@/components/dashboard/team/InviteLists";
import { DateRange, formatLeagueDate, LeagueStatusBadge, ResultPill, RoleBadge, TeamLogo } from "@/components/dashboard/team/team-ui";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { getLeaguesForTeams, getMyPendingInvites, getMyRecentLeagueMatches, getMyTeams } from "@/lib/teams/queries";
import { matchResult } from "@/lib/teams/standings";

export const metadata: Metadata = { title: "Team Dashboard", robots: { index: false, follow: false } };

export default async function TeamDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/team/dashboard");

  const [teams, invites, { recent, totals }] = await Promise.all([
    getMyTeams(user.id),
    getMyPendingInvites(user.id),
    getMyRecentLeagueMatches(user.id),
  ]);

  const teamById = new Map(teams.map((t) => [t.id, t]));
  const activeLeagues = (await getLeaguesForTeams(teams.map((t) => t.id)))
    .filter((l) => l.status !== "ended")
    .map((league) => ({ team: teamById.get(league.team_id)!, league }));
  const winRate = totals.played > 0 ? Math.round((totals.wins / totals.played) * 100) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Team Dashboard"
        title="Overview"
        description="Your teams, leagues and league matches at a glance."
        actions={
          <Button asChild size="sm">
            <Link href="/account/team/teams/new">
              <Plus /> New team
            </Link>
          </Button>
        }
      />

      <KpiGrid>
        <KpiCard label="Teams" value={teams.length} icon={Shield} href="/account/team/teams" />
        <KpiCard
          label="Active leagues"
          value={activeLeagues.filter((a) => a.league.status === "active").length}
          hint={`${activeLeagues.filter((a) => a.league.status === "upcoming").length} upcoming`}
          icon={Trophy}
        />
        <KpiCard
          label="League record"
          value={
            <span>
              {totals.wins}-{totals.losses}-{totals.ties}
            </span>
          }
          hint={`${totals.played} match${totals.played === 1 ? "" : "es"} played`}
          icon={Swords}
        />
        <KpiCard label="Win rate" value={winRate === null ? "—" : `${winRate}%`} emphasis={winRate !== null} icon={CalendarRange} />
      </KpiGrid>

      {invites.length > 0 ? (
        <Panel title="Team invitations" icon={Mail} meta={`${invites.length} pending`}>
          <MyInvitesList invites={invites} />
        </Panel>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Panel title="My teams" icon={UsersRound} action={{ href: "/account/team/teams", label: "All teams" }} bodyClassName="p-0">
          {teams.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={Shield}
                title="You're not on a team yet"
                description="Create a team and invite players, or accept an invitation from a captain."
                action={
                  <Button asChild size="sm">
                    <Link href="/account/team/teams/new">
                      <Plus /> Create a team
                    </Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-outline-variant/15">
              {teams.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/account/team/teams/${t.slug}`}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-container/50"
                  >
                    <TeamLogo name={t.name} logoUrl={t.logo_url} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">
                        {t.name}
                        {t.tag ? <span className="ml-1.5 font-mono text-xs text-on-surface/45">{t.tag}</span> : null}
                      </p>
                      <p className="text-xs text-on-surface/45">
                        {t.memberCount} member{t.memberCount === 1 ? "" : "s"} · {t.leagueCount} league{t.leagueCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    {t.myRole ? <RoleBadge role={t.myRole} /> : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Current leagues" icon={Trophy} bodyClassName="p-0">
          {activeLeagues.length === 0 ? (
            <p className="px-4 py-4 text-[13px] text-on-surface/50">No active or upcoming leagues.</p>
          ) : (
            <ul className="divide-y divide-outline-variant/15">
              {activeLeagues.map(({ team, league }) => (
                <li key={league.id}>
                  <Link
                    href={`/account/team/teams/${team.slug}/leagues/${league.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-container/50"
                  >
                    <TeamLogo name={team.name} logoUrl={team.logo_url} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{league.name}</p>
                      <p className="truncate text-xs text-on-surface/45">
                        {team.name} · <DateRange start={league.start_date} end={league.end_date} />
                      </p>
                    </div>
                    <LeagueStatusBadge status={league.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="My recent league matches" icon={Swords} bodyClassName="p-0">
        {recent.length === 0 ? (
          <p className="px-4 py-4 text-[13px] text-on-surface/50">No league matches logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-outline-variant/20">
                  <th className="px-4">Date</th>
                  <th className="px-4">Opponent</th>
                  <th className="hidden px-4 md:table-cell">League</th>
                  <th className="px-4 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((m) => (
                  <tr key={m.id} className="border-b border-outline-variant/15 last:border-0">
                    <td className="whitespace-nowrap px-4 tabular-nums text-on-surface/55">{formatLeagueDate(m.playedOn)}</td>
                    <td className="px-4 font-medium">{m.opponentName}</td>
                    <td className="hidden px-4 md:table-cell">
                      <Link
                        href={`/account/team/teams/${m.teamSlug}/leagues/${m.leagueId}`}
                        className="text-on-surface/70 hover:text-on-surface hover:underline"
                      >
                        {m.leagueName}
                      </Link>
                      <span className="text-on-surface/40"> · {m.teamName}</span>
                    </td>
                    <td className="px-4">
                      <span className="flex items-center justify-end gap-2">
                        <span className="font-mono font-semibold tabular-nums">
                          {m.playerPoints}–{m.opponentPoints}
                        </span>
                        <ResultPill result={matchResult(m.playerPoints, m.opponentPoints)} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
