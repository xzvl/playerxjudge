import { CalendarViewClient } from "@/components/calendar/CalendarViewClient";
import { getPublicTournamentListings } from "@/lib/tournaments/public-listings";

// Server wrapper: fetches the real, published tournaments and hands them to
// the client component that owns the interactive calendar (month
// navigation, province/community filters, tournament picking) — same UI as
// before, real data instead of lib/mock/tournaments.ts. Same split as
// TournamentListings/TournamentListingsClient on /tournaments.
export async function CalendarView() {
  const tournaments = await getPublicTournamentListings();
  return <CalendarViewClient tournaments={tournaments} />;
}
