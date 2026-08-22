"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Locate } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useGeolocation } from "@/lib/hooks/use-geolocation";
import { distanceKm } from "@/lib/geo";
import type { PublicCommunityListing } from "@/lib/communities/public-profile";

const RANGE_OPTIONS_KM = [10, 25, 50, 100];

const CommunityMap = dynamic(
  () => import("@/components/communities/CommunityMap").then((mod) => mod.CommunityMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full animate-pulse bg-surface-container-low" aria-hidden="true" />
    ),
  },
);

// Same map-with-pins shape as FindTournamentSectionClient
// (components/tournaments/FindTournamentSectionClient.tsx), scoped to
// approved communities instead of upcoming tournaments — clicking a pin
// goes straight to that community's public page rather than opening a
// quick-look modal (no community-details modal exists, unlike tournaments').
export function FindCommunitySectionClient({ communities }: { communities: PublicCommunityListing[] }) {
  const router = useRouter();

  const { position: userPosition, locating, error: locationError, locate } = useGeolocation();
  const [rangeKm, setRangeKm] = useState(50);

  // getPublicCommunitiesWithLocation (FindCommunitySection) already only
  // hands over communities with a real pin, so every entry here has a
  // usable latitude/longitude — no "0,0 means unpinned" filtering needed
  // the way the tournament finder needs (see FindTournamentSectionClient).
  const nearbyCount = useMemo(() => {
    if (!userPosition) return null;
    return communities.filter((c) => distanceKm(userPosition, [c.latitude!, c.longitude!]) <= rangeKm).length;
  }, [communities, userPosition, rangeKm]);

  return (
    <section
      className="mx-auto max-w-[1440px] px-4 py-16 md:px-16"
      aria-labelledby="find-community-heading"
    >
      <div className="mb-8">
        <p className="label-mono text-primary">Explore</p>
        <h2 id="find-community-heading" className="heading mt-2 text-3xl md:text-4xl">
          Find a Community Near You
        </h2>
        <p className="mt-3 max-w-xl text-sm text-on-surface/60">
          Every approved community is pinned on the map below. Hover a pin for its name, click it to open the full
          details.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="gap-1.5"
          disabled={locating}
          tooltip="Show nearby communities within a range of your current location"
          onClick={locate}
        >
          <Locate className="h-3.5 w-3.5" /> {locating ? "Locating…" : "Use My Location"}
        </Button>
        {userPosition ? (
          <label className="flex items-center gap-1.5 text-xs text-on-surface/60">
            Within
            <select
              value={rangeKm}
              onChange={(e) => setRangeKm(Number(e.target.value))}
              aria-label="Nearby range"
              className="border border-outline-variant/40 bg-surface-container-low px-2 py-1 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {RANGE_OPTIONS_KM.map((km) => (
                <option key={km} value={km}>
                  {km} km
                </option>
              ))}
            </select>
            {nearbyCount !== null ? (
              <span className="text-on-surface/50">
                — {nearbyCount} nearby
              </span>
            ) : null}
          </label>
        ) : null}
        {locationError ? <p className="text-xs text-destructive">{locationError}</p> : null}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-on-surface/50">
        <div className="flex items-center gap-2">
          <svg width="14" height="19" viewBox="0 0 24 32" fill="none" aria-hidden="true">
            <path
              d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20c0-6.627-5.373-12-12-12z"
              fill="#ed0d11"
              stroke="#131313"
              strokeWidth="1"
            />
            <circle cx="12" cy="12" r="4.5" fill="#131313" />
          </svg>
          Default pin
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-primary bg-surface-container-low" />
          Community logo pin
        </div>
      </div>

      {communities.length > 0 ? (
        <div className="h-[480px] border border-outline-variant/25 bg-surface-container-lowest md:h-[560px]">
          <CommunityMap
            communities={communities}
            onSelect={(slug) => router.push(`/communities/${slug}`)}
            userPosition={userPosition}
            radiusKm={userPosition ? rangeKm : null}
          />
        </div>
      ) : (
        <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
          No approved communities have a pinned location yet.
        </p>
      )}
    </section>
  );
}
