import type { Metadata } from "next";

import { StatisticsPanel } from "@/components/dashboard/player/StatisticsPanel";
import { getCurrentProfile } from "@/lib/supabase/get-user";

export const metadata: Metadata = { title: "Statistics", robots: { index: false, follow: false } };

export default async function StatisticsPage() {
  const profile = await getCurrentProfile();

  return (
    <div>
      <p className="label-mono text-primary">Player Dashboard</p>
      <h1 className="heading mt-2 text-3xl">Statistics</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Your battle record, broken down by finish type.</p>
      <div className="mt-8">
        <StatisticsPanel fullBodyPhotoUrl={profile?.full_body_photo_url ?? null} />
      </div>
    </div>
  );
}
