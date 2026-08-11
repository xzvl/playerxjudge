"use client";

import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";

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
      map.setView([lat, lng], Math.max(map.getZoom(), 14));
    }
  }, [lat, lng, map]);

  return null;
}

export function LocationPickerMap({
  lat,
  lng,
  onChange,
  locked = false,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  locked?: boolean;
}) {
  const center: [number, number] = lat !== null && lng !== null ? [lat, lng] : PH_CENTER;

  return (
    <MapContainer center={center} zoom={lat !== null ? 14 : 6} scrollWheelZoom className="map-tiles-dark h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickToPlace locked={locked} onChange={onChange} />
      <Recenter lat={lat} lng={lng} />
      {lat !== null && lng !== null ? (
        <Marker
          position={[lat, lng]}
          icon={pinIcon()}
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
