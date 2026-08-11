import { FindTournamentSectionClient } from "@/components/tournaments/FindTournamentSectionClient";
import { getPublicUpcomingTournamentsWithLocation } from "@/lib/tournaments/public-listings";

// Server wrapper: fetches real upcoming tournaments that have a pin dropped
// and hands them to the client component that owns the map/interactivity —
// same pattern as TournamentListings.
export async function FindTournamentSection() {
  const tournaments = await getPublicUpcomingTournamentsWithLocation();
  return <FindTournamentSectionClient tournaments={tournaments} />;
}
