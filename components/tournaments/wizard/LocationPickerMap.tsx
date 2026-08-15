"use client";

import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";

const PH_CENTER: [number, number] = [12.8797, 121.774];
// Street-level rather than neighborhood-level once a pin is actually placed
// — close enough to make out the venue's own building/block.
const PIN_ZOOM = 17;
// Without an explicit min/max, Leaflet defaults to 0 (the whole globe) and
// Infinity (no cap at all) — letting someone zoom out past any use for a
// venue picker, or zoom in past the point where OSM's raster tile server
// actually has imagery (it tops out at 19; past that Leaflet just re-scales
// the last real tiles it fetched instead of fetching anything new).
const MIN_ZOOM = 5;
const MAX_ZOOM = 19;

function pinIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `
      <div class="drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
        <svg width="36" height="48" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20c0-6.627-5.373-12-12-12z" fill="#ed0d11" stroke="#131313" stroke-width="1"/>
          <circle cx="12" cy="12" r="4.5" fill="#131313"/>
        </svg>
      </div>
    `,
    iconSize: [36, 48],
    iconAnchor: [18, 48],
  });
}

// Same circular-logo-on-a-pointer treatment as TournamentMap's own
// communityPinIcon — used here when the caller has a specific image for
// this pin (e.g. a community's own Pin Location Logo) instead of the
// generic red teardrop.
function customPinIcon(imageUrl: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `
      <div class="flex flex-col items-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
        <div class="h-10 w-10 overflow-hidden rounded-full border-2 border-primary bg-surface-container-low">
          <img src="${imageUrl}" alt="" class="h-full w-full object-cover" />
        </div>
        <div class="-mt-2 h-3.5 w-3.5 rotate-45 border-b-2 border-r-2 border-primary bg-surface-container-low"></div>
      </div>
    `,
    iconSize: [45, 58],
    iconAnchor: [22.5, 55],
  });
}

function ClickToPlace({ locked, onChange }: { locked: boolean; onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (locked) return;
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();

  useEffect(() => {
    if (lat !== null && lng !== null) {
      map.setView([lat, lng], Math.max(map.getZoom(), PIN_ZOOM));
    }
  }, [lat, lng, map]);

  return null;
}

export function LocationPickerMap({
  lat,
  lng,
  onChange,
  locked = false,
  pinIconUrl = null,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  locked?: boolean;
  // A specific image to show for this pin instead of the generic red
  // teardrop — e.g. a community's own Pin Location Logo on its Settings
  // page. Omitted (or null) everywhere else.
  pinIconUrl?: string | null;
}) {
  const center: [number, number] = lat !== null && lng !== null ? [lat, lng] : PH_CENTER;
  const icon = pinIconUrl ? customPinIcon(pinIconUrl) : pinIcon();

  return (
    <MapContainer
      center={center}
      zoom={lat !== null ? PIN_ZOOM : 6}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      scrollWheelZoom
      className="map-tiles-dark h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={MAX_ZOOM}
      />
      <ClickToPlace locked={locked} onChange={onChange} />
      <Recenter lat={lat} lng={lng} />
      {lat !== null && lng !== null ? (
        <Marker
          position={[lat, lng]}
          icon={icon}
          draggable={!locked}
          eventHandlers={{
            dragend: (e) => {
              if (locked) return;
              const pos = (e.target as L.Marker).getLatLng();
              onChange(pos.lat, pos.lng);
            },
          }}
        />
      ) : null}
    </MapContainer>
  );
}
