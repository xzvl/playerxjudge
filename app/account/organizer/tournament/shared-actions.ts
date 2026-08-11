"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { MAX_THUMBNAIL_UPLOAD_BYTES } from "@/lib/validations/tournament-wizard";

// Live availability check for the wizard/settings Slug field, in addition to
// the unique-constraint error both create/update actions already handle on
// submit — this lets the UI say "taken" before the organizer even submits.
export async function checkSlugAvailable(slug: string, excludeTournamentId?: string): Promise<{ available: boolean }> {
  if (!slug || slug.length < 3) return { available: false };

  const supabase = await createClient();
  let query = supabase.from("tournaments").select("id").eq("slug", slug).limit(1);
  if (excludeTournamentId) query = query.neq("id", excludeTournamentId);

  const { data, error } = await query;
  if (error) return { available: false };
  return { available: (data?.length ?? 0) === 0 };
}

// Free geocoding via OpenStreetMap's Nominatim — matches the free Leaflet +
// OSM tiles already used for the public tournament map (no API key needed).
// Runs server-side both to avoid CORS and to send a proper User-Agent, which
// Nominatim's usage policy requires.
export async function geocodeAddress(address: string): Promise<{ status: "success" | "error"; lat?: number; lng?: number; message?: string }> {
  const query = address.trim();
  if (!query) return { status: "error", message: "Enter an address first." };

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ph&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "PlayerXJudge/1.0 (tournament venue lookup)" },
    });
    if (!response.ok) return { status: "error", message: "Couldn't reach the geocoding service." };

    const results = (await response.json()) as { lat: string; lon: string }[];
    if (results.length === 0) return { status: "error", message: "No matching location found for that address." };

    return { status: "success", lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
  } catch {
    return { status: "error", message: "Couldn't reach the geocoding service." };
  }
}

export interface AddressSuggestion {
  label: string;
  addressLine: string;
  city: string;
  province: string;
  lat: number;
  lng: number;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    quarter?: string;
    city?: string;
    town?: string;
    municipality?: string;
    village?: string;
    state?: string;
    province?: string;
    region?: string;
  };
}

// Free address autocomplete, same Nominatim endpoint as geocodeAddress but
// with addressdetails=1 so the structured road/city/state breakdown can fill
// Address Line, City, and Province in one pick — no API key needed. Runs
// server-side for the same CORS/User-Agent reasons as geocodeAddress.
export async function searchAddressSuggestions(
  query: string
): Promise<{ status: "success" | "error"; results?: AddressSuggestion[]; message?: string }> {
  const q = query.trim();
  if (q.length < 4) return { status: "success", results: [] };

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=ph&q=${encodeURIComponent(q)}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "PlayerXJudge/1.0 (tournament venue lookup)" },
    });
    if (!response.ok) return { status: "error", message: "Couldn't reach the address lookup service." };

    const raw = (await response.json()) as NominatimResult[];
    const results: AddressSuggestion[] = raw.map((r) => {
      const addr = r.address ?? {};
      const addressLine = [addr.house_number, addr.road].filter(Boolean).join(" ") || addr.neighbourhood || addr.suburb || addr.quarter || "";
      const city = addr.city || addr.town || addr.municipality || addr.village || "";
      const province = addr.province || addr.state || addr.region || "";
      return {
        label: r.display_name,
        addressLine,
        city,
        province,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
      };
    });

    return { status: "success", results };
  } catch {
    return { status: "error", message: "Couldn't reach the address lookup service." };
  }
}

// Square (`thumbnail_url`) or horizontal banner (`banner_url`) — stored as
// `${tournamentId}/square.webp` / `${tournamentId}/horizontal.webp` in the
// public `tournament-thumbnails` bucket. Callable as soon as the tournament
// row exists: immediately from Settings, or right after creation from the
// New wizard (see CreateTournamentWizard's submit — the file is held in
// memory and only uploaded once a real tournament id comes back).
export async function uploadTournamentThumbnail(
  tournamentId: string,
  kind: "square" | "banner",
  formData: FormData
): Promise<{ status: "success" | "error"; message?: string; url?: string }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { status: "error", message: "No file provided." };
  if (file.type !== "image/webp") return { status: "error", message: "Image must be converted to WebP before upload." };
  if (file.size > MAX_THUMBNAIL_UPLOAD_BYTES) return { status: "error", message: "Image is too large." };

  const supabase = await createClient();
  const path = `${tournamentId}/${kind === "square" ? "square" : "horizontal"}.webp`;

  const { error: uploadError } = await supabase.storage
    .from("tournament-thumbnails")
    .upload(path, file, { upsert: true, contentType: "image/webp" });
  if (uploadError) return { status: "error", message: uploadError.message };

  const { data: publicUrlData } = supabase.storage.from("tournament-thumbnails").getPublicUrl(path);
  const url = `${publicUrlData.publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase
    .from("tournaments")
    .update(kind === "square" ? { thumbnail_url: url } : { banner_url: url })
    .eq("id", tournamentId);
  if (updateError) return { status: "error", message: updateError.message };

  return { status: "success", url };
}

// The pre-registration payment QR code (Settings only) — stored as
// `${tournamentId}/payment-qr.webp` in the same `tournament-thumbnails`
// bucket as the square/banner images above, reusing its existing RLS
// policies rather than needing a bucket of its own.
export async function uploadPaymentQr(
  tournamentId: string,
  formData: FormData
): Promise<{ status: "success" | "error"; message?: string; url?: string }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { status: "error", message: "No file provided." };
  if (file.type !== "image/webp") return { status: "error", message: "Image must be converted to WebP before upload." };
  if (file.size > MAX_THUMBNAIL_UPLOAD_BYTES) return { status: "error", message: "Image is too large." };

  const supabase = await createClient();
  const path = `${tournamentId}/payment-qr.webp`;

  const { error: uploadError } = await supabase.storage
    .from("tournament-thumbnails")
    .upload(path, file, { upsert: true, contentType: "image/webp" });
  if (uploadError) return { status: "error", message: uploadError.message };

  const { data: publicUrlData } = supabase.storage.from("tournament-thumbnails").getPublicUrl(path);
  const url = `${publicUrlData.publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase
    .from("tournaments")
    .update({ preregistration_qr_url: url })
    .eq("id", tournamentId);
  if (updateError) return { status: "error", message: updateError.message };

  return { status: "success", url };
}

// "Use square image on horizontal image" toggle — reuses the already
// uploaded square image's URL as the banner rather than storing the file
// twice.
export async function applySquareThumbnailAsBanner(
  tournamentId: string
): Promise<{ status: "success" | "error"; message?: string; url?: string | null }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { data: tournament } = await supabase.from("tournaments").select("thumbnail_url").eq("id", tournamentId).maybeSingle();
  if (!tournament) return { status: "error", message: "Tournament not found." };

  const { error } = await supabase.from("tournaments").update({ banner_url: tournament.thumbnail_url }).eq("id", tournamentId);
  if (error) return { status: "error", message: error.message };

  return { status: "success", url: tournament.thumbnail_url };
}

export async function clearTournamentBanner(tournamentId: string): Promise<{ status: "success" | "error"; message?: string }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("tournaments").update({ banner_url: null }).eq("id", tournamentId);
  if (error) return { status: "error", message: error.message };

  return { status: "success" };
}
