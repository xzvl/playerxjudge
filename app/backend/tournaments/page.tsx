import type { Metadata } from "next";
import { Activity, CalendarClock, ListChecks, Trophy } from "lucide-react";

import { TournamentsPanel, type TournamentItem } from "@/components/backend/TournamentsPanel";
import { createClient } from "@/lib/supabase/server";
import type { Tournament } from "@/lib/types/database";
import { KpiCard, KpiGrid, PageHeader, Panel } from "@/components/dashboard/erp";
import { BarList } from "@/components/dashboard/charts";

export const metadata: Metadata = { title: "Tournaments", robots: { index: false, follow: false } };

interface TournamentWithOrganizerRow extends Tournament {
  profiles: { display_name: string } | null;
}

export default async function BackendTournamentsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tournaments")
    .select("id, title, slug, status, starts_at, profiles(display_name)")
    .order("starts_at", { ascending: false });

  const tournaments: TournamentItem[] = (
    (data as unknown as Pick<TournamentWithOrganizerRow, "id" | "title" | "slug" | "status" | "starts_at" | "profiles">[] | null) ?? []
  ).map((t) => ({
    id: t.id,
    title: t.title,
    slug: t.slug,
    organizerName: t.profiles?.display_name ?? "Unknown",
    status: t.status,
    startsAt: t.starts_at,
  }));

  const humanize = (v: string) => v.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  const statusCounts = new Map<string, number>();
  for (const t of tournaments) statusCounts.set(t.status, (statusCounts.get(t.status) ?? 0) + 1);
  const byStatus = [...statusCounts.entries()].sort((a, b) => b[1] - a[1]).map(([status, value]) => ({ label: humanize(status), value }));
  const liveCount = statusCounts.get("ongoing") ?? 0;
  const openCount = statusCounts.get("registration_open") ?? 0;
  const now = Date.now();
  const upcomingCount = tournaments.filter((t) => new Date(t.startsAt).getTime() > now && t.status !== "cancelled").length;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Backend"
        title="Tournaments"
        description="Every tournament on the platform."
      />
      <div className="grid gap-3 lg:grid-cols-3">
        <KpiGrid className="sm:grid-cols-2 lg:col-span-2 xl:grid-cols-2">
          <KpiCard label="Tournaments" value={tournaments.length} icon={Trophy} emphasis hint="Every tournament on the platform" />
          <KpiCard label="Live now" value={liveCount} icon={Activity} hint="Status: ongoing" />
          <KpiCard label="Registration open" value={openCount} icon={ListChecks} hint="Accepting players" />
          <KpiCard label="Upcoming" value={upcomingCount} icon={CalendarClock} hint="Start date in the future" />
        </KpiGrid>
        <Panel title="By status" icon={Trophy}>
          <BarList items={byStatus} emptyLabel="No tournaments yet." />
        </Panel>
      </div>
      <div>
        <TournamentsPanel tournaments={tournaments} />
      </div>
    </div>
  );
}
