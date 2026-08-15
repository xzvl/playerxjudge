import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AnalyticsPanel, type AnalyticsTournamentRow } from "@/components/dashboard/organizer/AnalyticsPanel";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import type { Tournament } from "@/lib/types/database";

export const metadata: Metadata = { title: "Analytics", robots: { index: false, follow: false } };

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/organizer/analytics");

  const supabase = await createClient();
  const { data: tournamentRows } = await supabase
    .from("tournaments")
    .select("id, title, max_participants, view_count")
    .eq("organizer_id", user.id);
  const tournaments = (tournamentRows as Pick<Tournament, "id" | "title" | "max_participants" | "view_count">[] | null) ?? [];
  const tournamentIds = tournaments.map((t) => t.id);

  const participantCountByTournamentId = new Map<string, number>();
  if (tournamentIds.length > 0) {
    const { data: participantRows } = await supabase
      .from("tournament_participants")
      .select("tournament_id")
      .in("tournament_id", tournamentIds);
    for (const row of (participantRows as { tournament_id: string }[] | null) ?? []) {
      participantCountByTournamentId.set(row.tournament_id, (participantCountByTournamentId.get(row.tournament_id) ?? 0) + 1);
    }
  }

  const rows: AnalyticsTournamentRow[] = tournaments.map((t) => ({
    id: t.id,
    title: t.title,
    participantCount: participantCountByTournamentId.get(t.id) ?? 0,
    maxParticipants: t.max_participants,
    viewCount: t.view_count,
  }));

  return (
    <div>
      <p className="label-mono text-primary">Organizer Dashboard</p>
      <h1 className="heading mt-2 text-3xl">Analytics</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">
        How your tournaments are performing, at a glance.
      </p>
      <div className="mt-8">
        <AnalyticsPanel tournaments={rows} />
      </div>
    </div>
  );
}
