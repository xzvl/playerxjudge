"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window` on import, so it's loaded client-side only, same
// as VenueMapSection does for the small embedded map on the tournament
// detail page — this is that page's full, interactive counterpart.
const TournamentLocationMap = dynamic(
  () => import("@/components/tournaments/TournamentLocationMap").then((mod) => mod.TournamentLocationMap),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-surface-container-low" aria-hidden="true" /> }
);

export function TournamentLocationMapSection({ lat, lng, title }: { lat: number; lng: number; title: string }) {
  return (
    <div className="h-[70vh] min-h-[420px] w-full overflow-hidden border border-outline-variant/25">
      <TournamentLocationMap lat={lat} lng={lng} title={title} />
    </div>
  );
}
