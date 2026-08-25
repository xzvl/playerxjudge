import { PlayerLoadingScreen } from "@/components/tournaments/player/PlayerLoadingScreen";

// Next.js's automatic route-level loading UI: this route has no nested
// layout.tsx wrapping it, so this renders as the full page (inside the root
// layout) the moment a fresh navigation into this route starts — a shared
// link, a direct visit, a hard refresh — and is swapped out the instant
// page.tsx finishes its own data fetching/rendering. No wiring needed here
// beyond the file existing.
//
// Switching players while ALREADY on this page goes through
// PlayerNamePicker's own useTransition-driven overlay instead — a plain
// same-page searchParams navigation isn't guaranteed to trigger this
// boundary the same reliable way a fresh route entry does, so that overlay
// is what actually covers "every changing of players shows a loading
// screen." Both render the same PlayerLoadingScreen so they read as one
// consistent loading state regardless of which one's showing.
export default function PlayerViewLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <PlayerLoadingScreen />
    </div>
  );
}
