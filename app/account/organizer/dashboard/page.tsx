import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  CheckSquare,
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
import {
  MOCK_ORGANIZED_TOURNAMENTS,
  MOCK_ORGANIZER_REGISTRATIONS,
  MOCK_REPORTS,
  MOCK_REVENUE,
} from "@/lib/mock/organizer-dashboard";

export const metadata: Metadata = { title: "Organizer Dashboard", robots: { index: false, follow: false } };

const OTHER_FEATURES = [
  { label: "Analytics", href: "/account/organizer/analytics", icon: BarChart3 },
  { label: "Revenue", href: "/account/organizer/revenue", icon: DollarSign },
  { label: "Tournament Management", href: "/account/organizer/tournament", icon: Trophy },
  { label: "Community Management", href: "/account/organizer/community", icon: Users2 },
  { label: "Reports", href: "/account/organizer/reports", icon: FileText },
  { label: "Participants", href: "/account/organizer/participants", icon: Users },
  { label: "Check-in", href: "/account/organizer/check-in", icon: CheckSquare },
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
        .select("id, status, communities(name), profiles(username, display_name)")
        .in("community_id", communityIds)
        .order("requested_at");
      assignments = (data as unknown as JudgeAssignmentRow[] | null) ?? [];
    }
  }

  const totalTournaments = MOCK_ORGANIZED_TOURNAMENTS.length;
  const totalParticipants = MOCK_ORGANIZER_REGISTRATIONS.filter((r) => r.status !== "cancelled").length;
  const totalRevenue = MOCK_REVENUE.filter((r) => r.status === "paid").reduce((sum, r) => sum + r.amount, 0);
  const openReports = MOCK_REPORTS.filter((r) => r.status === "open").length;

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
                    <p className="text-sm font-medium text-on-surface">
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
