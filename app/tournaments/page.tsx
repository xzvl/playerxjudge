import type { Metadata } from "next";
import { Trophy } from "lucide-react";

import { PagePlaceholder } from "@/components/layout/PagePlaceholder";
import { TournamentListings } from "@/components/tournaments/TournamentListings";

export const metadata: Metadata = {
  title: "Tournaments",
  description: "Browse upcoming and recent Beyblade X community tournaments across the Philippines.",
};

export default function TournamentsPage() {
  return (
    <div>
      <PagePlaceholder
        eyebrow="Browse"
        title="All Tournaments"
        description="Filter by province, community, and format to find your next battle."
        Icon={Trophy}
      />
      <TournamentListings />
    </div>
  );
}
