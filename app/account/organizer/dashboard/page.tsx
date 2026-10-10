import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  DollarSign,
  Download,
  FileText,
  Flag,
  Gavel,
  Trophy,
  Users,
  Users2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { KpiCard, KpiGrid, PageHeader, Panel } from "@/components/dashboard/erp";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { decideCommunityJudge } from "@/app/account/organizer/dashboard/actions";
import { formatCompactNumber, formatCurrency } from "@/lib/format";

export const metadata: Metadata = { title: "Organizer Dashboard", robots: { index: false, follow: false } };

const OTHER_FEATURES = [
  { label: "Analytics", href: "/account/organizer/analytics", icon: BarChart3 },
  { label: "Revenue", href: "/account/organizer/revenue", icon: DollarSign },
  { label: "Tournament Management", href: "/account/organizer/tournament", icon: Trophy },
  { label: "Community Management", href: "/account/organizer/community", icon: Users2 },
  { label: "Reports", href: "/account/organizer/reports", icon: FileText },
  { label: "Participants", href: "/account/organizer/participants", icon: Users },
  { label: "Export CSV", href: "/account/organizer/export-csv", icon: Download },
];

interface JudgeAssignmentRow {
  id: string;
  status: "pending" | "approved" | "removed";
  communities: { name: string } | null;
  profiles: { username: string; display_name: string } | null;
}

export default async function OrganizerDashboardPage() {
  let assignments: JudgeAssignmentRow[] = [];
  let totalTournaments = 0;
  let totalParticipants = 0;
  let totalRevenue = 0;
  let openReports = 0;

  if (isSupabaseConfigured) {
    const user = await getCurrentUser();
    const supabase = await createClient();

    const { data: myCommunities } = await supabase
      .from("communities")
      .select("id")
      .eq("owner_id", user?.id ?? "");

    const communityIds = (myCommunities ?? []).map((c) => c.id);

    if (communityIds.length > 0) {
      const { data } = await supabase
        .from("community_judges")
        // profiles(...) alone is ambiguous — community_judges has two FKs to
        // profiles (judge_id, decided_by); this list is about the judge, not
        // whoever approved/removed them.
        .select("id, status, communities(name), profiles!community_judges_judge_id_fkey(username, display_name)")
        .in("community_id", communityIds)
        .order("requested_at");
      assignments = (data as unknown as JudgeAssignmentRow[] | null) ?? [];
    }

    if (user) {
      const { data: tournamentRows } = await supabase
        .from("tournaments")
        .select("id, entry_fee, preregistration_amount")
        .eq("organizer_id", user.id);
      const tournaments = tournamentRows ?? [];
      totalTournaments = tournaments.length;
      const tournamentIds = tournaments.map((t) => t.id);

      if (tournamentIds.length > 0) {
        const [{ count: participantCount }, { data: preregRows }, { count: reportCount }] = await Promise.all([
          supabase.from("tournament_participants").select("id", { count: "exact", head: true }).in("tournament_id", tournamentIds),
          // Advance-payment pre-registrations are the only real money-tracking
          // data in the app right now (see RevenuePanel) — "confirmed" is
          // what the organizer marks once they've checked the uploaded
          // screenshot.
          supabase
            .from("tournament_preregistrations")
            .select("tournament_id")
            .eq("advance_payment", true)
            .eq("payment_status", "confirmed")
            .in("tournament_id", tournamentIds),
          supabase.from("tournament_reports").select("id", { count: "exact", head: true }).eq("status", "open").in("tournament_id", tournamentIds),
        ]);
        totalParticipants = participantCount ?? 0;
        openReports = reportCount ?? 0;

        const feeByTournamentId = new Map(tournaments.map((t) => [t.id, t.preregistration_amount ?? t.entry_fee ?? 0]));
        totalRevenue = (preregRows ?? []).reduce((sum, r) => sum + (feeByTournamentId.get(r.tournament_id) ?? 0), 0);
      }
    }
  }

  const pendingJudges = assignments.filter((a) => a.status === "pending").length;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Organizer"
        title="Organizer Dashboard"
        description="Manage your tournaments, communities, and revenue from one place."
      />

      <KpiGrid>
        <KpiCard label="Tournaments" value={totalTournaments} icon={Trophy} href="/account/organizer/tournament" emphasis hint="Created by you" />
        <KpiCard
          label="Participants"
          value={formatCompactNumber(totalParticipants)}
          icon={Users}
          href="/account/organizer/participants"
          hint="Across all your tournaments"
        />
        <KpiCard
          label="Revenue Collected"
          value={formatCurrency(totalRevenue)}
          icon={DollarSign}
          href="/account/organizer/revenue"
          hint="Confirmed advance payments"
        />
        <KpiCard label="Open Reports" value={openReports} icon={Flag} href="/account/organizer/reports" hint="Awaiting your action" />
      </KpiGrid>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel
          title="Judge Requests"
          icon={Gavel}
          meta={assignments.length > 0 ? `${pendingJudges} pending` : undefined}
          className="lg:col-span-2"
          bodyClassName="p-0"
        >
          {assignments.length === 0 ? (
            <p className="p-4 text-sm text-on-surface/50">No judges have requested to judge your communities yet.</p>
          ) : (
            <ul className="divide-y divide-outline-variant/15">
              {assignments.map((assignment) => (
                <li key={assignment.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-primary/[0.04]">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-on-surface">
                      {assignment.profiles?.display_name ?? "Unknown"}{" "}
                      <span className="font-normal text-on-surface/40">@{assignment.profiles?.username}</span>
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-on-surface/40">
                      {assignment.communities?.name} &middot; <span className={assignment.status === "pending" ? "text-primary" : undefined}>{assignment.status}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {assignment.status === "pending" ? (
                      <form action={decideCommunityJudge.bind(null, assignment.id, "approved")}>
                        <Button type="submit" size="sm" tooltip="Approve this judge request">
                          Approve
                        </Button>
                      </form>
                    ) : null}
                    {assignment.status !== "removed" ? (
                      <form action={decideCommunityJudge.bind(null, assignment.id, "removed")}>
                        <Button type="submit" size="sm" variant="outline" tooltip="Remove this judge">
                          Remove
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Quick Access" icon={BarChart3} bodyClassName="p-2">
          <nav className="flex flex-col">
            {OTHER_FEATURES.map((feature) => (
              <Link
                key={feature.href}
                href={feature.href}
                className="group flex items-center gap-2.5 border-l-2 border-transparent px-3 py-2 text-[13px] text-on-surface/75 transition-colors hover:border-primary hover:bg-primary/[0.06] hover:text-on-surface"
              >
                <feature.icon className="h-4 w-4 text-on-surface/40 transition-colors group-hover:text-primary" aria-hidden="true" />
                {feature.label}
              </Link>
            ))}
          </nav>
        </Panel>
      </div>
    </div>
  );
}
