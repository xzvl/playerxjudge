import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bell, CalendarDays, Heart, ListChecks, MapPin, Star, Swords } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BattleTypeBadge } from "@/components/tournaments/badges";
import { formatDate, formatTime } from "@/lib/format";
import { MOCK_TOURNAMENTS } from "@/lib/mock/tournaments";
import {
  ACHIEVEMENTS,
  MOCK_COMMUNITY_MEMBERSHIPS,
  MOCK_MATCHES,
  MOCK_NOTIFICATIONS,
  MOCK_REGISTRATIONS,
  PLAYER_STATS,
} from "@/lib/mock/player-dashboard";
import { getCurrentProfile } from "@/lib/supabase/get-user";

export const metadata: Metadata = { title: "Player Dashboard", robots: { index: false, follow: false } };

export default async function PlayerDashboardPage() {
  const profile = await getCurrentProfile();
  const province = profile?.province ?? null;

  const upcoming = MOCK_TOURNAMENTS.filter((t) => t.isUpcoming).sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  );
  const nextTournament = (province ? upcoming.find((t) => t.province === province) : null) ?? upcoming[0] ?? null;

  const currentRegistrations = MOCK_REGISTRATIONS.filter((r) => {
    const t = MOCK_TOURNAMENTS.find((t) => t.id === r.tournamentId);
    return t?.isUpcoming;
  }).length;

  const unlockedAchievements = ACHIEVEMENTS.filter((a) => a.achieved).length;
  const currentCommunities = MOCK_COMMUNITY_MEMBERSHIPS.filter((c) => c.endedAt === null).length;
  const activeNotifications = MOCK_NOTIFICATIONS.filter((n) => n.status === "active").length;
  const winningPercentage =
    PLAYER_STATS.totalMatches > 0 ? Math.round((PLAYER_STATS.totalWins / PLAYER_STATS.totalMatches) * 100) : 0;

  return (
    <div>
      <p className="label-mono text-primary">Player Dashboard</p>
      <h1 className="heading mt-2 text-3xl">Overview</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">
        Your tournament activity, match history, and achievements at a glance.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Next Upcoming Tournament</CardTitle>
            <Link
              href="/account/player/upcoming-tournaments"
              className="label-mono flex items-center gap-1 text-primary hover:underline"
            >
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {nextTournament ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <BattleTypeBadge type={nextTournament.battleType} />
                  </div>
                  <p className="heading text-lg">{nextTournament.title}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-on-surface/60">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {nextTournament.locationName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="flex items-center justify-end gap-1.5 text-sm text-on-surface">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {formatDate(nextTournament.startsAt)}
                  </p>
                  <p className="mt-1 text-xs text-on-surface/50">{formatTime(nextTournament.startsAt)}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-on-surface/50">No upcoming tournaments right now.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Notifications</CardTitle>
            <Link
              href="/account/player/notifications"
              className="label-mono flex items-center gap-1 text-primary hover:underline"
            >
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-outline-variant/40 text-primary">
              <Bell className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-2xl font-bold text-on-surface">{activeNotifications}</p>
              <p className="text-xs text-on-surface/50">Active notification{activeNotifications === 1 ? "" : "s"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/account/player/statistics" className="block">
          <Card className="h-full transition-colors hover:border-primary/40">
            <CardContent className="p-5">
              <p className="label-mono text-on-surface/40">Winning %</p>
              <p className="mt-2 font-mono text-2xl font-bold text-primary">{winningPercentage}%</p>
              <p className="mt-1 text-xs text-on-surface/50">
                {PLAYER_STATS.totalWins}W &ndash; {PLAYER_STATS.totalLosses}L ({PLAYER_STATS.totalMatches} matches)
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/account/player/registered-tournaments" className="block">
          <Card className="h-full transition-colors hover:border-primary/40">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-on-surface/40">
                <ListChecks className="h-4 w-4" aria-hidden="true" />
                <p className="label-mono">Registered</p>
              </div>
              <p className="mt-2 font-mono text-2xl font-bold text-on-surface">{currentRegistrations}</p>
              <p className="mt-1 text-xs text-on-surface/50">Current &amp; upcoming tournaments</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/account/player/achievements" className="block">
          <Card className="h-full transition-colors hover:border-primary/40">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-on-surface/40">
                <Star className="h-4 w-4" aria-hidden="true" />
                <p className="label-mono">Achievements</p>
              </div>
              <p className="mt-2 font-mono text-2xl font-bold text-on-surface">
                {unlockedAchievements}/{ACHIEVEMENTS.length}
              </p>
              <p className="mt-1 text-xs text-on-surface/50">Unlocked</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/account/player/favorite-communities" className="block">
          <Card className="h-full transition-colors hover:border-primary/40">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-on-surface/40">
                <Heart className="h-4 w-4" aria-hidden="true" />
                <p className="label-mono">Communities</p>
              </div>
              <p className="mt-2 font-mono text-2xl font-bold text-on-surface">{currentCommunities}</p>
              <p className="mt-1 text-xs text-on-surface/50">Currently a member of</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Swords className="h-4 w-4 text-primary" aria-hidden="true" /> Recent Matches
          </CardTitle>
          <Link
            href="/account/player/match-history"
            className="label-mono flex items-center gap-1 text-primary hover:underline"
          >
            View All <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {MOCK_MATCHES.slice(0, 4).map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between gap-4 border-b border-outline-variant/15 py-2 text-sm last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate text-on-surface">{m.tournamentTitle}</p>
                <p className="text-xs text-on-surface/50">vs {m.opponent}</p>
              </div>
              <Badge variant={m.result === "won" ? "success" : "destructive"}>{m.result}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
