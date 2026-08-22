import { FindTournamentSectionClient } from "@/components/tournaments/FindTournamentSectionClient";
import { getPublicUpcomingTournamentsWithLocation } from "@/lib/tournaments/public-listings";

// Server wrapper: fetches real upcoming tournaments that have a pin dropped
// and hands them to the client component that owns the map/interactivity —
// same pattern as TournamentListings. `fullPage` passes straight through —
// see FindTournamentSectionClient's own doc comment (used by /map).
export async function FindTournamentSection({ fullPage = false }: { fullPage?: boolean } = {}) {
  const tournaments = await getPublicUpcomingTournamentsWithLocation();
  return <FindTournamentSectionClient tournaments={tournaments} fullPage={fullPage} />;
}
