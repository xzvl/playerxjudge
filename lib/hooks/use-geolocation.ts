"use client";

import { useCallback, useState } from "react";

// Thin wrapper over the browser Geolocation API — shared by every "Use My
// Location" control (the tournament/community finder maps, the single-venue
// /map/[slug] page) so the permission/error handling only lives in one
// place. Doesn't cache or watch position; each `locate()` call is a fresh
// one-shot request, matching how a "Use My Location" button is expected to
// behave (re-click to refresh, not a silent background tracker).
export function useGeolocation() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("Your browser doesn't support location.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      (err) => {
        setError(err.code === err.PERMISSION_DENIED ? "Location access was denied." : "Couldn't get your location.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return { position, locating, error, locate };
}
