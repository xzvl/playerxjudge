import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { StatisticsPanel } from "@/components/dashboard/player/StatisticsPanel";
import { getCurrentProfile, getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import { fetchLinkedTournaments, fetchPlayerMatches } from "@/lib/player/linked-participants";
import { computePlayerStats } from "@/lib/player/stats";
import { PageHeader } from "@/components/dashboard/erp";

export const metadata: Metadata = { title: "Statistics", robots: { index: false, follow: false } };

export default async function StatisticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/player/statistics");

  const supabase = await createClient();
  const [profile, linked] = await Promise.all([getCurrentProfile(), fetchLinkedTournaments(supabase, user.id)]);
  const matches = await fetchPlayerMatches(supabase, linked);
  const stats = computePlayerStats(matches);

  return (
    <div>
      <PageHeader
        eyebrow="Player Dashboard"
        title="Statistics"
        description="Your battle record, broken down by finish type."
      />
      <div className="mt-5">
        <StatisticsPanel fullBodyPhotoUrl={profile?.full_body_photo_url ?? null} stats={stats} />
      </div>
    </div>
  );
}
