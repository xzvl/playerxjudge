"use client";

import dynamic from "next/dynamic";

const VenueMap = dynamic(() => import("@/components/tournaments/VenueMap").then((mod) => mod.VenueMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-surface-container-low" aria-hidden="true" />,
});

export function VenueMapSection({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div className="h-72 w-full overflow-hidden border border-outline-variant/25">
      <VenueMap lat={lat} lng={lng} />
    </div>
  );
}
