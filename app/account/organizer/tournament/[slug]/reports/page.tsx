import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TournamentReportsPanel, type ReportItem } from "@/components/dashboard/organizer/TournamentReportsPanel";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import { getManagedTournament } from "@/app/account/organizer/tournament/[slug]/data";
import type { TournamentReportStatus } from "@/lib/types/database";
import { PageHeader } from "@/components/dashboard/erp";

export const metadata: Metadata = { title: "Reports", robots: { index: false, follow: false } };

interface ReportRow {
  id: string;
  target_label: string;
  reason: string;
  status: TournamentReportStatus;
  created_at: string;
  profiles: { display_name: string } | null;
}

export default async function TournamentReportsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectTo=/account/organizer/tournament/${slug}/reports`);

  const tournament = await getManagedTournament(user.id, slug);
  const supabase = await createClient();
  const { data } = await supabase
    .from("tournament_reports")
    .select("id, target_label, reason, status, created_at, profiles(display_name)")
    .eq("tournament_id", tournament.id)
    .order("created_at", { ascending: false });

  const reports: ReportItem[] = ((data as unknown as ReportRow[] | null) ?? []).map((r) => ({
    id: r.id,
    reporterName: r.profiles?.display_name ?? "Unknown",
    targetLabel: r.target_label,
    reason: r.reason,
    status: r.status,
    createdAt: r.created_at,
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Tournament Management"
        title="Reports"
        description="Player-filed issues for this tournament."
        as="h2"
      />
      <div className="mt-5">
        <TournamentReportsPanel slug={tournament.slug} reports={reports} />
      </div>
    </div>
  );
}
