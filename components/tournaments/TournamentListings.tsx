import { TournamentListingsClient } from "@/components/tournaments/TournamentListingsClient";
import { getPublicTournamentListings } from "@/lib/tournaments/public-listings";

// Server wrapper: fetches the real, published tournaments and hands them to
// the client component that owns the interactive filtering (search,
// province/community, upcoming/recent tabs) — same UI, real data instead of
// lib/mock/tournaments.ts. Used on both the homepage and /tournaments.
export async function TournamentListings() {
  const tournaments = await getPublicTournamentListings();
  return <TournamentListingsClient tournaments={tournaments} />;
}
