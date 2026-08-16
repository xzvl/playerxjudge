import type { Metadata } from "next";

import { TournamentReportsPanel, type ReportItem } from "@/components/dashboard/organizer/TournamentReportsPanel";
import { createClient } from "@/lib/supabase/server";
import { getManagedTournamentForStaff } from "@/app/account/organizer/tournament/[slug]/data";
import type { TournamentReportStatus } from "@/lib/types/database";

export const metadata: Metadata = { title: "Reports", robots: { index: false, follow: false } };

interface ReportRow {
  id: string;
  target_label: string;
  reason: string;
  status: TournamentReportStatus;
  created_at: string;
  profiles: { display_name: string } | null;
}

export default async function BackendTournamentReportsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tournament = await getManagedTournamentForStaff(slug);
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
      <p className="label-mono text-primary">Backend</p>
      <h2 className="heading mt-2 text-2xl">Reports</h2>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Player-filed issues for this tournament.</p>
      <div className="mt-8">
        <TournamentReportsPanel slug={tournament.slug} reports={reports} />
      </div>
    </div>
  );
}
