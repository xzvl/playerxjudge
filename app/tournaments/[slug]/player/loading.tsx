import { TournamentPageSkeleton } from "@/components/tournaments/TournamentPageSkeleton";

// Route-level loading UI: shown on first load and on a refresh until
// page.tsx finishes its data fetching. Switching players while already on
// the page uses PlayerNamePicker's own overlay instead.
export default function PlayerViewLoading() {
  return <TournamentPageSkeleton />;
}
