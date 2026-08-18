import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Gavel, MapPin } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { JudgeAssignmentStatusBadge, TournamentStatusBadge } from "@/components/dashboard/organizer/badges";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import type { JudgeAssignmentStatus, TournamentStatus } from "@/lib/types/database";

export const metadata: Metadata = { title: "Assigned Tournaments", robots: { index: false, follow: false } };

interface AssignmentRow {
  id: string;
  status: JudgeAssignmentStatus;
  tournaments: {
    slug: string;
    title: string;
    status: TournamentStatus;
    starts_at: string;
    location_name: string | null;
  } | null;
}

export default async function AssignedTournamentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/judge/assigned-tournaments");

  const supabase = await createClient();
  const { data } = await supabase
    .from("judges")
    .select("id, status, tournaments(slug, title, status, starts_at, location_name)")
    .eq("judge_id", user.id)
    .neq("status", "removed")
    .order("assigned_at", { ascending: false });

  const assignments = ((data as unknown as AssignmentRow[] | null) ?? []).filter((a) => a.tournaments);

  return (
    <div>
      <p className="label-mono text-primary">Judge Dashboard</p>
      <h1 className="heading mt-2 text-3xl">Assigned Tournaments</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">
        Tournaments you&apos;ve been invited to judge, confirmed and pending.
      </p>

      <div className="mt-8">
        {assignments.length === 0 ? (
          <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
            No tournaments assigned yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {assignments.map((assignment) => {
              const tournament = assignment.tournaments!;
              return (
                <Card key={assignment.id}>
                  <CardContent className="space-y-3 pt-6">
                    <div className="flex items-start justify-between gap-2">
                      <TournamentStatusBadge status={tournament.status} />
                      <JudgeAssignmentStatusBadge status={assignment.status} />
                    </div>
                    <p className="heading text-base leading-tight">{tournament.title}</p>
                    <div className="space-y-1 text-xs text-on-surface/50">
                      <p className="flex items-center gap-1.5">
                        <CalendarDays className="h-3 w-3 shrink-0" aria-hidden="true" /> {formatDate(tournament.starts_at)}
                      </p>
                      {tournament.location_name ? (
                        <p className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" /> {tournament.location_name}
                        </p>
                      ) : null}
                    </div>
                    <Button asChild variant="outline" size="sm" className="w-full gap-1.5" tooltip="Open the judge console">
                      <Link href={`/tournaments/${tournament.slug}/judge`}>
                        <Gavel className="h-3.5 w-3.5" /> Judge Console
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
