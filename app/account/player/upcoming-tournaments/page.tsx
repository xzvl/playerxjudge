import type { Metadata } from "next";

import { UpcomingTournamentsPanel } from "@/components/dashboard/player/UpcomingTournamentsPanel";
import { getCurrentProfile } from "@/lib/supabase/get-user";
import { getPublicTournamentListings } from "@/lib/tournaments/public-listings";
import { PageHeader } from "@/components/dashboard/erp";

export const metadata: Metadata = { title: "Upcoming Tournaments", robots: { index: false, follow: false } };

export default async function UpcomingTournamentsPage() {
  const [profile, tournaments] = await Promise.all([getCurrentProfile(), getPublicTournamentListings()]);

  return (
    <div>
      <PageHeader
        eyebrow="Player Dashboard"
        title="Upcoming Tournaments"
        description="Tournaments happening near you, soonest first."
      />
      <div className="mt-5">
        <UpcomingTournamentsPanel tournaments={tournaments} province={profile?.province ?? null} />
      </div>
    </div>
  );
}
