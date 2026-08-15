import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ReportsPanel, type OrganizerReportItem } from "@/components/dashboard/organizer/ReportsPanel";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import type { Tournament, TournamentReportStatus } from "@/lib/types/database";

export const metadata: Metadata = { title: "Reports", robots: { index: false, follow: false } };

interface ReportRow {
  id: string;
  tournament_id: string;
  target_label: string;
  reason: string;
  status: TournamentReportStatus;
  created_at: string;
  profiles: { display_name: string } | null;
}

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/organizer/reports");

  const supabase = await createClient();
  const { data: tournamentRows } = await supabase
    .from("tournaments")
    .select("id, slug, title")
    .eq("organizer_id", user.id);
  const tournaments = (tournamentRows as Pick<Tournament, "id" | "slug" | "title">[] | null) ?? [];
  const tournamentIds = tournaments.map((t) => t.id);

  let reports: OrganizerReportItem[] = [];
  if (tournamentIds.length > 0) {
    const { data } = await supabase
      .from("tournament_reports")
      .select("id, tournament_id, target_label, reason, status, created_at, profiles(display_name)")
      .in("tournament_id", tournamentIds)
      .order("created_at", { ascending: false });

    const tournamentById = new Map(tournaments.map((t) => [t.id, t]));
    reports = ((data as unknown as ReportRow[] | null) ?? []).map((r) => {
      const tournament = tournamentById.get(r.tournament_id);
      return {
        id: r.id,
        tournamentSlug: tournament?.slug ?? "",
        tournamentTitle: tournament?.title ?? "Unknown Tournament",
        reporterName: r.profiles?.display_name ?? "Unknown",
        targetLabel: r.target_label,
        reason: r.reason,
        status: r.status,
        createdAt: r.created_at,
      };
    });
  }

  return (
    <div>
      <p className="label-mono text-primary">Organizer Dashboard</p>
      <h1 className="heading mt-2 text-3xl">Reports</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Moderation reports filed against your tournaments and communities.</p>
      <div className="mt-8">
        <ReportsPanel reports={reports} />
      </div>
    </div>
  );
}
