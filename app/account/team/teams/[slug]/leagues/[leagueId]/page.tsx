import type { Metadata } from "next";
import Link from "next/link";
import { Plus, X } from "lucide-react";

import { loadLeagueContext } from "@/app/account/team/data";
import { Button } from "@/components/ui/button";
import { LeagueManageActions } from "@/components/dashboard/team/LeagueActions";
import { LeagueTabs, type LeagueTab } from "@/components/dashboard/team/LeagueTabs";
import { MatchHistory } from "@/components/dashboard/team/MatchHistory";
import { RosterBoard, type RosterPlayerStats } from "@/components/dashboard/team/RosterBoard";
import { StandingsTable } from "@/components/dashboard/team/StandingsTable";
import { DateRange, ExternalPageLink, LeagueStatusBadge } from "@/components/dashboard/team/team-ui";
import { getLeagueView } from "@/lib/teams/league-view";
import { getTeamMembers, leagueStatus } from "@/lib/teams/queries";

export const metadata: Metadata = { title: "League", robots: { index: false, follow: false } };

const TABS: LeagueTab[] = ["roster", "standings", "matches"];

export default async function LeaguePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; leagueId: string }>;
  searchParams: Promise<{ tab?: string; player?: string }>;
}) {
  const { slug, leagueId } = await params;
  const sp = await searchParams;
  const { team, league, userId, isManager } = await loadLeagueContext(slug, leagueId);
  const [view, members] = await Promise.all([getLeagueView(league), getTeamMembers(team.id)]);

  const base = `/account/team/teams/${team.slug}/leagues/${league.id}`;
  const onRoster = view.roster.some((r) => r.profile.id === userId);
  const canAddMatch = isManager ? view.roster.length > 0 : onRoster;
  const initialTab: LeagueTab = TABS.includes(sp.tab as LeagueTab) ? (sp.tab as LeagueTab) : "roster";

  const stats: Record<string, RosterPlayerStats> = {};
  for (const r of view.standings) {
    stats[r.profileId] = { rank: r.rank, record: `${r.wins}-${r.losses}-${r.ties}`, score: r.score, played: r.played };
  }
  const rosterIds = new Set(view.roster.map((r) => r.profile.id));
  const available = members.filter((m) => !rosterIds.has(m.profile.id)).map((m) => m.profile);

  const playerFilter = sp.player && view.profiles.has(sp.player) ? sp.player : null;
  const shownMatches = playerFilter ? view.matches.filter((m) => m.player.id === playerFilter) : view.matches;

  const addMatchButton = canAddMatch ? (
    <Button asChild size="sm">
      <Link href={`${base}/matches/new${playerFilter ? `?player=${playerFilter}` : ""}`}>
        <Plus /> Add match
      </Link>
    </Button>
  ) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="heading truncate">{league.name}</h2>
            <LeagueStatusBadge status={leagueStatus(league)} />
          </div>
          <p className="mt-0.5 text-xs text-on-surface/50">
            <DateRange start={league.start_date} end={league.end_date} /> · {league.elite_count} elite player
            {league.elite_count === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {addMatchButton}
          {isManager ? <LeagueManageActions teamId={team.id} teamSlug={team.slug} league={league} /> : null}
          <ExternalPageLink href={`/teams/${team.slug}/leagues/${league.id}`} />
        </div>
      </div>

      {!isManager && !onRoster ? (
        <p className="rounded-md border border-outline-variant/25 bg-surface-container-low px-3 py-2 text-[13px] text-on-surface/60">
          You&apos;re not on this league&apos;s roster, so you can&apos;t log matches here yet. Ask your captain to add you.
        </p>
      ) : null}

      <LeagueTabs
        initialTab={initialTab}
        counts={{ roster: view.roster.length, matches: view.matches.length }}
        roster={
          <RosterBoard
            leagueId={league.id}
            eliteCount={league.elite_count}
            initialElite={view.elite}
            initialSubs={view.subs}
            available={available}
            stats={stats}
            canManage={isManager}
          />
        }
        standings={
          <div className="rounded-lg border border-outline-variant/25 bg-surface-container-low">
            <StandingsTable
              rows={view.standings}
              profiles={view.profiles}
              slotById={view.slotById}
              matchHistoryHref={(id) => `${base}?tab=matches&player=${id}`}
            />
            <p className="border-t border-outline-variant/15 px-3 py-2 text-xs text-on-surface/45">
              Ranked by Score, then Buchholz, TB, Pts diff and Pts. Hover a column header for its definition.
            </p>
          </div>
        }
        matches={
          <div className="space-y-3">
            {playerFilter ? (
              <div className="flex items-center gap-2 text-[13px]">
                <span className="text-on-surface/55">Showing matches for</span>
                <span className="font-medium">{view.profiles.get(playerFilter)?.displayName}</span>
                <Link
                  href={`${base}?tab=matches`}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-on-surface/55 hover:bg-surface-container hover:text-on-surface"
                >
                  <X className="h-3 w-3" aria-hidden="true" /> Clear
                </Link>
              </div>
            ) : null}
            <MatchHistory
              matches={shownMatches}
              canEdit={(m) => isManager || m.player.id === userId || m.createdBy === userId}
              editHref={(m) => `${base}/matches/${m.id}/edit`}
              emptyAction={addMatchButton}
            />
          </div>
        }
      />
    </div>
  );
}
