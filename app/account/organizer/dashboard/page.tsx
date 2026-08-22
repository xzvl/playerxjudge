import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  DollarSign,
  Download,
  FileText,
  Gavel,
  Trophy,
  Users,
  Users2,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="space-y-10">
      <div>
        <h1 className="heading text-2xl">Organizer Dashboard</h1>
        <p className="mt-2 max-w-xl text-sm text-on-surface/60">
          Manage your tournaments, communities, and revenue from one place.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/account/organizer/tournament" className="block">
          <Card className="h-full transition-colors hover:border-primary/40">
            <CardContent className="p-5">
              <p className="label-mono text-on-surface/40">Tournaments</p>
              <p className="mt-2 font-mono text-2xl font-bold text-primary">{totalTournaments}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/account/organizer/participants" className="block">
          <Card className="h-full transition-colors hover:border-primary/40">
            <CardContent className="p-5">
              <p className="label-mono text-on-surface/40">Participants</p>
              <p className="mt-2 font-mono text-2xl font-bold text-on-surface">{formatCompactNumber(totalParticipants)}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/account/organizer/revenue" className="block">
          <Card className="h-full transition-colors hover:border-primary/40">
            <CardContent className="p-5">
              <p className="label-mono text-on-surface/40">Revenue Collected</p>
              <p className="mt-2 font-mono text-2xl font-bold text-on-surface">{formatCurrency(totalRevenue)}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/account/organizer/reports" className="block">
          <Card className="h-full transition-colors hover:border-primary/40">
            <CardContent className="p-5">
              <p className="label-mono text-on-surface/40">Open Reports</p>
              <p className="mt-2 font-mono text-2xl font-bold text-on-surface">{openReports}</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <section>
        <h2 className="label-mono mb-4 flex items-center gap-2 text-primary">
          <Gavel className="h-4 w-4" aria-hidden="true" /> Judge Requests
        </h2>
        {assignments.length === 0 ? (
          <p className="border border-outline-variant/25 bg-surface-container-low p-6 text-sm text-on-surface/50">
            No judges have requested to judge your communities yet.
          </p>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <Card key={assignment.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
                  <div>
                    <p className="text-sm font-bold text-on-surface">
                      {assignment.profiles?.display_name ?? "Unknown"}{" "}
                      <span className="text-on-surface/40">@{assignment.profiles?.username}</span>
                    </p>
                    <p className="label-mono mt-1 text-on-surface/40">
                      {assignment.communities?.name} &middot; {assignment.status}
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="label-mono mb-4 text-on-surface/40">More Tools</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {OTHER_FEATURES.map((feature) => (
            <Link key={feature.href} href={feature.href} className="block">
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <feature.icon className="h-4 w-4 text-primary" aria-hidden="true" /> {feature.label}
                  </CardTitle>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
