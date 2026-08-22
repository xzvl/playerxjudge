"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Tooltip, Circle, useMap } from "react-leaflet";

import type { MockTournament } from "@/lib/mock/tournaments";

const PH_CENTER: [number, number] = [12.8797, 121.774];

function pinIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `
      <div class="drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
        <svg width="30" height="40" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20c0-6.627-5.373-12-12-12z" fill="#ed0d11" stroke="#131313" stroke-width="1"/>
          <circle cx="12" cy="12" r="4.5" fill="#131313"/>
        </svg>
      </div>
    `,
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    tooltipAnchor: [0, -34],
  });
}

function communityPinIcon(logoUrl: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `
      <div class="flex flex-col items-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
        <div class="h-8 w-8 overflow-hidden rounded-full border-2 border-primary bg-surface-container-low">
          <img src="${logoUrl}" alt="" class="h-full w-full object-cover" />
        </div>
        <div class="-mt-1.5 h-3 w-3 rotate-45 border-b-2 border-r-2 border-primary bg-surface-container-low"></div>
      </div>
    `,
    iconSize: [36, 46],
    iconAnchor: [18, 44],
    tooltipAnchor: [0, -40],
  });
}

// A pulsing blue dot for "you are here" — visually distinct from the
// tournament pins (red teardrop / community logo) at a glance. Same
// treatment as TournamentLocationMap's own meIcon (the single-venue
// /map/[slug] page) — duplicated rather than shared, same convention every
// icon builder in these map components already follows.
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

function FitToMarkers({ tournaments }: { tournaments: MockTournament[] }) {
  const map = useMap();

  useEffect(() => {
    if (tournaments.length === 0) return;
    const bounds = L.latLngBounds(tournaments.map((t) => [t.latitude, t.longitude]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 12 });
  }, [map, tournaments]);

  return null;
}

// Once "Use My Location" succeeds, the view shifts to frame the visitor's
// nearby range instead of every pin on the map — that's the point of
// picking a location + range, so this takes over from FitToMarkers above
// rather than the two competing. LatLng.toBounds() (a square box of the
// given size around a point) computes this from plain geography, unlike
// L.circle(...).getBounds() — a Circle layer's getBounds() needs the layer
// actually attached to a map to know its pixel radius, which one created
// only to measure never is (that's the "layerPointToLatLng of undefined"
// crash this replaced).
function FitToRange({ center, radiusKm }: { center: [number, number]; radiusKm: number }) {
  const map = useMap();

  useEffect(() => {
    const bounds = L.latLng(center).toBounds(radiusKm * 1000);
    map.fitBounds(bounds, { padding: [48, 48] });
  }, [map, center, radiusKm]);

  return null;
}

export function TournamentMap({
  tournaments,
  onSelect,
  userPosition = null,
  radiusKm = null,
}: {
  tournaments: MockTournament[];
  onSelect: (id: string) => void;
  // "Use My Location" state, lifted up into FindTournamentSectionClient
  // (so the button/range picker can live outside the map itself) — a
  // pulsing "you are here" marker plus a translucent circle showing the
  // chosen nearby range, both only rendered once a position is actually
  // known.
  userPosition?: [number, number] | null;
  radiusKm?: number | null;
}) {
  const defaultIcon = useMemo(() => pinIcon(), []);
  const youAreHereIcon = useMemo(() => meIcon(), []);
  const communityIcons = useMemo(() => {
    const cache = new Map<string, L.DivIcon>();
    for (const t of tournaments) {
      if (t.communityLogoUrl && !cache.has(t.communityLogoUrl)) {
        cache.set(t.communityLogoUrl, communityPinIcon(t.communityLogoUrl));
      }
    }
    return cache;
  }, [tournaments]);

  return (
    <MapContainer
      center={PH_CENTER}
      zoom={6}
      scrollWheelZoom={false}
      className="map-tiles-dark h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {userPosition && radiusKm ? <FitToRange center={userPosition} radiusKm={radiusKm} /> : <FitToMarkers tournaments={tournaments} />}
      {tournaments.map((t) => (
        <Marker
          key={t.id}
          position={[t.latitude, t.longitude]}
          icon={t.communityLogoUrl ? communityIcons.get(t.communityLogoUrl)! : defaultIcon}
          eventHandlers={{ click: () => onSelect(t.id) }}
        >
          <Tooltip direction="top" offset={[0, -2]}>
            {t.title}
          </Tooltip>
        </Marker>
      ))}
      {userPosition ? (
        <>
          <Marker position={userPosition} icon={youAreHereIcon}>
            <Tooltip direction="top">You are here</Tooltip>
          </Marker>
          {radiusKm ? (
            <Circle
              center={userPosition}
              radius={radiusKm * 1000}
              pathOptions={{ color: "#38bdf8", weight: 1.5, fillColor: "#38bdf8", fillOpacity: 0.08 }}
            />
          ) : null}
        </>
      ) : null}
    </MapContainer>
  );
}
