"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import { Locate, Navigation } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useGeolocation } from "@/lib/hooks/use-geolocation";

// Same red-teardrop pin as VenueMap.tsx/TournamentMap.tsx — duplicated
// rather than shared, matching how those two already each keep their own
// copy instead of a common icon module.
function pinIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `
      <div class="drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
        <svg width="34" height="46" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20c0-6.627-5.373-12-12-12z" fill="#ed0d11" stroke="#131313" stroke-width="1"/>
          <circle cx="12" cy="12" r="4.5" fill="#131313"/>
        </svg>
      </div>
    `,
    iconSize: [34, 46],
    iconAnchor: [17, 46],
    tooltipAnchor: [0, -38],
  });
}

// A pulsing blue dot for "you are here" — visually distinct from the venue's
// own red teardrop pin at a glance.
function meIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `
      <div class="relative flex h-4 w-4 items-center justify-center">
        <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400/60"></span>
        <span class="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-sky-500 shadow-[0_0_0_1px_rgba(0,0,0,0.3)]"></span>
      </div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    tooltipAnchor: [0, -10],
  });
}

// Pans/zooms to just the visitor's own location once geolocation succeeds —
// deliberately doesn't fit both points into view or draw a route: this is
// "where am I", not a route preview (see the Get Directions link below for
// actual turn-by-turn routing).
function PanToUser({ position }: { position: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo(position, Math.max(map.getZoom(), 15));
  }, [map, position]);

  return null;
}

// Full-page, interactive venue map (behind /map/[slug]) — distinct from the
// small, static VenueMap embedded on the tournament detail page itself.
// Adds "Use My Location" (browser geolocation → drops a "you are here" pin
// and centers the map on it) and "Get Directions" (hands off to Google Maps
// for actual turn-by-turn routing, which this app has no API key/backend of
// its own to provide).
export function TournamentLocationMap({ lat, lng, title }: { lat: number; lng: number; title: string }) {
  const { position: userPosition, locating, error: locationError, locate } = useGeolocation();

  const venuePinIcon = useMemo(() => pinIcon(), []);
  const youAreHereIcon = useMemo(() => meIcon(), []);
  const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        scrollWheelZoom
        dragging
        doubleClickZoom
        zoomControl
        attributionControl={false}
        className="map-tiles-dark h-full w-full"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[lat, lng]} icon={venuePinIcon}>
          <Tooltip direction="top">{title}</Tooltip>
        </Marker>
        {userPosition ? (
          <>
            <Marker position={userPosition} icon={youAreHereIcon}>
              <Tooltip direction="top">You are here</Tooltip>
            </Marker>
            <PanToUser position={userPosition} />
          </>
        ) : null}
      </MapContainer>

      <div className="absolute left-3 top-3 z-[1001] flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="gap-1.5 shadow-md"
          disabled={locating}
          tooltip="Show your current location on the map"
          onClick={locate}
        >
          <Locate className="h-3.5 w-3.5" /> {locating ? "Locating…" : "Use My Location"}
        </Button>
        <Button asChild size="sm" className="gap-1.5 shadow-md" tooltip="Open turn-by-turn directions in Google Maps">
          <a href={directionsHref} target="_blank" rel="noopener noreferrer">
            <Navigation className="h-3.5 w-3.5" /> Get Directions
          </a>
        </Button>
      </div>

      {locationError ? (
        <div
          role="alert"
          className="absolute bottom-3 right-3 z-[1001] max-w-[16rem] border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs text-destructive shadow-md"
        >
          {locationError}
        </div>
      ) : null}
    </div>
  );
}
