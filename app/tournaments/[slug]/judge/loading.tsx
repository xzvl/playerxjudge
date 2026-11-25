import { TournamentPageSkeleton } from "@/components/tournaments/TournamentPageSkeleton";

// Route-level loading UI: shown on first load and on a refresh until
// page.tsx finishes its data fetching.
export default function JudgeViewLoading() {
  return <TournamentPageSkeleton />;
}
