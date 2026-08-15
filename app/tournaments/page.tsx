import type { Metadata } from "next";
import { TournamentListings } from "@/components/tournaments/TournamentListings";
import { FindTournamentSection } from "@/components/tournaments/FindTournamentSection";

export const metadata: Metadata = {
  title: "Tournaments",
  description: "Browse upcoming and recent Beyblade X community tournaments across the Philippines.",
};

export default function TournamentsPage() {
  return (
    <div>
      <FindTournamentSection />
      <TournamentListings />
    </div>
  );
}
