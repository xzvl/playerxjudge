"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker } from "react-leaflet";

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
  });
}

// Single-pin venue map for the tournament detail page — no click-to-place,
// no dragging the pin, just "here's where it is," but the viewer can zoom
// (scroll wheel, double-click, +/- controls) and pan around to get their
// bearings.
export function VenueMap({ lat, lng }: { lat: number; lng: number }) {
  return (
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
      <Marker position={[lat, lng]} icon={pinIcon()} />
    </MapContainer>
  );
}
