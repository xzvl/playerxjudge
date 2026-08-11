import type { Metadata } from "next";

import { UpcomingTournamentsPanel } from "@/components/dashboard/player/UpcomingTournamentsPanel";
import { getCurrentProfile } from "@/lib/supabase/get-user";

export const metadata: Metadata = { title: "Upcoming Tournaments", robots: { index: false, follow: false } };

export default async function UpcomingTournamentsPage() {
  const profile = await getCurrentProfile();

  return (
    <div>
      <p className="label-mono text-primary">Player Dashboard</p>
      <h1 className="heading mt-2 text-3xl">Upcoming Tournaments</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">
        Tournaments happening near you, soonest first.
      </p>
      <div className="mt-8">
        <UpcomingTournamentsPanel province={profile?.province ?? null} />
      </div>
    </div>
  );
}
