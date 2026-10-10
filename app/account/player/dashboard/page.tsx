import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bell, CalendarDays, Crosshair, Heart, ListChecks, MapPin, Star, Swords, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { BattleTypeBadge } from "@/components/tournaments/badges";
import { BarList } from "@/components/dashboard/charts";
import { KpiCard, KpiGrid, Meter, PageHeader, Panel } from "@/components/dashboard/erp";
import { formatDate, formatTime } from "@/lib/format";
import { getCurrentProfile, getCurrentUser, getUnreadNotificationCount } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import { getPublicTournamentListings } from "@/lib/tournaments/public-listings";
import { computeBirdKing, fetchLinkedTournaments, fetchPlayerMatches } from "@/lib/player/linked-participants";
import { computePlayerStats, FINISH_TYPE_LABELS } from "@/lib/player/stats";
import { ACHIEVEMENT_DEFS, computeAchievements } from "@/lib/player/achievements";

export const metadata: Metadata = { title: "Player Dashboard", robots: { index: false, follow: false } };

const RESULT_BADGE_VARIANT = { won: "success", lost: "destructive", draw: "outline" } as const;

export default async function PlayerDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/player/dashboard");

  const supabase = await createClient();
  const [profile, tournaments, activeNotifications, { count: currentCommunities }, linked] = await Promise.all([
    getCurrentProfile(),
    getPublicTournamentListings(),
    getUnreadNotificationCount(),
    supabase.from("profile_communities").select("id", { count: "exact", head: true }).eq("profile_id", user.id).eq("status", "approved"),
    fetchLinkedTournaments(supabase, user.id),
  ]);
  const [matches, birdKing] = await Promise.all([fetchPlayerMatches(supabase, linked), computeBirdKing(supabase, linked)]);
  const stats = computePlayerStats(matches);
  const achievements = computeAchievements(matches, linked, birdKing);
  const unlockedAchievements = achievements.filter((a) => a.achieved).length;

  const province = profile?.province ?? null;
  const upcoming = tournaments.filter((t) => t.isUpcoming).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const nextTournament = (province ? upcoming.find((t) => t.province === province) : null) ?? upcoming[0] ?? null;

  const upcomingIds = new Set(upcoming.map((t) => t.id));
  const currentRegistrations = linked.filter((l) => upcomingIds.has(l.tournamentId)).length;
  const finishItems = (Object.keys(FINISH_TYPE_LABELS) as (keyof typeof FINISH_TYPE_LABELS)[]).map((kind) => ({
    label: FINISH_TYPE_LABELS[kind],
    value: stats.finishCounts[kind],
  }));
  const winningPercentage = stats.totalMatches > 0 ? Math.round((stats.totalWins / stats.totalMatches) * 100) : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Player Dashboard"
        title="Overview"
        description="Your tournament activity, match history, and achievements at a glance."
      />

      <KpiGrid className="xl:grid-cols-5">
        <KpiCard
          label="Winning %"
          value={`${winningPercentage}%`}
          icon={Trophy}
          href="/account/player/statistics"
          emphasis
          hint={<>{stats.totalWins}W &ndash; {stats.totalLosses}L &middot; {stats.totalMatches} matches</>}
        >
          <Meter value={winningPercentage} label="Winning percentage" />
        </KpiCard>
        <KpiCard
          label="Registered"
          value={currentRegistrations}
          icon={ListChecks}
          href="/account/player/registered-tournaments"
          hint="Current & upcoming tournaments"
        />
        <KpiCard
          label="Achievements"
          value={`${unlockedAchievements}/${ACHIEVEMENT_DEFS.length}`}
          icon={Star}
          href="/account/player/achievements"
          hint="Unlocked"
        >
          <Meter
            value={ACHIEVEMENT_DEFS.length > 0 ? (unlockedAchievements / ACHIEVEMENT_DEFS.length) * 100 : 0}
            label="Achievements unlocked"
          />
        </KpiCard>
        <KpiCard
          label="Communities"
          value={currentCommunities ?? 0}
          icon={Heart}
          href="/account/player/favorite-communities"
          hint="Currently a member of"
        />
        <KpiCard
          label="Notifications"
          value={activeNotifications}
          icon={Bell}
          href="/account/player/notifications"
          hint={`Unread notification${activeNotifications === 1 ? "" : "s"}`}
        />
      </KpiGrid>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel
          title="Next Upcoming Tournament"
          icon={CalendarDays}
          action={{ href: "/account/player/upcoming-tournaments", label: "View All" }}
          className="lg:col-span-2"
        >
          {nextTournament ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap gap-2">
                  <BattleTypeBadge type={nextTournament.battleType} />
                </div>
                <p className="heading truncate text-lg">{nextTournament.title}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-on-surface/60">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {nextTournament.locationName}
                </p>
              </div>
              <div className="border-l border-outline-variant/25 pl-4 text-right">
                <p className="label-mono !text-[10px] text-on-surface/40">Starts</p>
                <p className="mt-1 text-sm font-semibold text-on-surface">{formatDate(nextTournament.startsAt)}</p>
                <p className="mt-0.5 font-mono text-xs text-on-surface/50">{formatTime(nextTournament.startsAt)}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-on-surface/50">No upcoming tournaments right now.</p>
          )}
        </Panel>

        <Panel title="Battle wins by finish" icon={Crosshair} action={{ href: "/account/player/statistics", label: "Stats" }}>
          <BarList items={finishItems} />
        </Panel>
      </div>

      <Panel
        title="Recent Matches"
        icon={Swords}
        action={{ href: "/account/player/match-history", label: "View All" }}
        meta={matches.length > 0 ? `${Math.min(matches.length, 5)} of ${matches.length}` : undefined}
        bodyClassName="p-0"
      >
        {matches.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="label-mono border-b border-outline-variant/25 text-on-surface/40">
                  <th className="px-4" scope="col">Tournament</th>
                  <th className="px-4" scope="col">Opponent</th>
                  <th className="px-4" scope="col">Stage</th>
                  <th className="px-4 text-right" scope="col">Result</th>
                </tr>
              </thead>
              <tbody>
                {matches.slice(0, 5).map((m) => (
                  <tr key={m.id} className="border-b border-outline-variant/15 last:border-0">
                    <td className="max-w-[16rem] truncate px-4 text-on-surface">{m.tournamentTitle}</td>
                    <td className="px-4 text-on-surface/70">{m.opponent}</td>
                    <td className="px-4 font-mono text-xs text-on-surface/50">
                      {m.stage} &middot; R{m.round}
                    </td>
                    <td className="px-4 text-right">
                      <Badge variant={RESULT_BADGE_VARIANT[m.result]}>{m.result}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-4 text-sm text-on-surface/50">
            No matches yet — link yourself to a tournament roster to start tracking history.
          </p>
        )}
      </Panel>
    </div>
  );
}
