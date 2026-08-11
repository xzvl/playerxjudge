"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useFormContext, useWatch } from "react-hook-form";
import { MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import type { CreateTournamentInput } from "@/lib/validations/tournament-wizard";
import { geocodeAddress, searchAddressSuggestions, type AddressSuggestion } from "@/app/account/organizer/tournament/shared-actions";

const LocationPickerMap = dynamic(
  () => import("@/components/tournaments/wizard/LocationPickerMap").then((mod) => mod.LocationPickerMap),
  {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse bg-surface-container-low" aria-hidden="true" />,
  }
);

export function LocationSection({ locked = false }: { locked?: boolean } = {}) {
  const form = useFormContext<CreateTournamentInput>();
  const [geocoding, startGeocoding] = useTransition();
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const addressLine = useWatch({ control: form.control, name: "addressLine" });
  const city = useWatch({ control: form.control, name: "city" });
  const province = useWatch({ control: form.control, name: "province" });
  const latitude = useWatch({ control: form.control, name: "latitude" });
  const longitude = useWatch({ control: form.control, name: "longitude" });

  const fullAddress = [addressLine, city, province].map((part) => part.trim()).filter(Boolean).join(", ");

  // Address autocomplete — debounced lookup as the organizer types the
  // Address Line, via the free Nominatim-backed searchAddressSuggestions.
  // Picking a suggestion fills Address Line, City, Province, and the pin all
  // at once (the suggestion already carries lat/lng), skipping a separate
  // "Generate Pin from Address" click.
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const skipNextSearch = useRef(false);

  useEffect(() => {
    if (locked) return;
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    if (!addressLine || addressLine.trim().length < 4) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      const result = await searchAddressSuggestions(addressLine);
      setSuggestions(result.status === "success" ? (result.results ?? []) : []);
      setSuggestOpen(true);
      setSearching(false);
    }, 500);
    return () => clearTimeout(handle);
  }, [addressLine, locked]);

  useEffect(() => {
    if (!suggestOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setSuggestOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [suggestOpen]);

  function setPin(lat: number, lng: number) {
    form.setValue("latitude", lat, { shouldValidate: true });
    form.setValue("longitude", lng, { shouldValidate: true });
  }

  function selectSuggestion(s: AddressSuggestion) {
    skipNextSearch.current = true;
    form.setValue("addressLine", s.addressLine, { shouldValidate: true });
    form.setValue("city", s.city, { shouldValidate: true });
    form.setValue("province", s.province, { shouldValidate: true });
    if (s.lat && s.lng) setPin(s.lat, s.lng);
    setSuggestions([]);
    setSuggestOpen(false);
  }

  function handleGeocode() {
    setGeocodeError(null);
    startGeocoding(async () => {
      const result = await geocodeAddress(fullAddress);
      if (result.status === "error" || result.lat === undefined || result.lng === undefined) {
        setGeocodeError(result.message ?? "Couldn't find that address.");
        return;
      }
      setPin(result.lat, result.lng);
    });
  }

  return (
    <div className="space-y-5">
      <FormField
        control={form.control}
        name="locationName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Venue Name</FormLabel>
            <FormControl>
              <Input placeholder="e.g. SM North EDSA Skydome" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="relative" ref={containerRef}>
          <FormField
            control={form.control}
            name="addressLine"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address Line (Street, Barangay)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Start typing to search…"
                    autoComplete="off"
                    {...field}
                    onFocus={() => {
                      if (suggestions.length > 0) setSuggestOpen(true);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {suggestOpen && !locked && (searching || suggestions.length > 0) ? (
            <div className="absolute left-0 top-full z-50 mt-1 w-full max-h-64 overflow-y-auto border border-outline-variant/40 bg-surface-container-lowest shadow-2xl">
              {searching ? (
                <p className="px-3 py-2 text-sm text-on-surface/50">Searching…</p>
              ) : (
                suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectSuggestion(s)}
                    className="block w-full border-b border-outline-variant/15 px-3 py-2 text-left text-sm text-on-surface last:border-b-0 hover:bg-surface-container-high"
                  >
                    {s.label}
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Pasig City" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="province"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Province</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Metro Manila" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-on-surface/50">
          {locked
            ? "The pin is locked now that the tournament has started."
            : "Pick an address suggestion above, click the map, drag the pin, or generate it from the address."}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          tooltip="Look up map coordinates from the address above"
          disabled={geocoding || !fullAddress.trim() || locked}
          onClick={handleGeocode}
        >
          <MapPin className="h-3.5 w-3.5" /> {geocoding ? "Locating..." : "Generate Pin from Address"}
        </Button>
      </div>
      {geocodeError ? (
        <p role="alert" className="text-sm text-destructive">
          {geocodeError}
        </p>
      ) : null}

      <div className="h-72 w-full overflow-hidden border border-outline-variant/40">
        <LocationPickerMap lat={latitude} lng={longitude} onChange={setPin} locked={locked} />
      </div>
      <p className="label-mono text-on-surface/40">
        {latitude !== null && longitude !== null ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` : "No pin placed yet."}
      </p>
    </div>
  );
}
