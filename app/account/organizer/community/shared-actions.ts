"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { MAX_LOGO_UPLOAD_BYTES } from "@/lib/validations/community";
import type { CommunityRow } from "@/lib/types/database";

// Live availability check for the Slug field — same "taken" pattern as
// checkSlugAvailable in app/account/organizer/tournament/shared-actions.ts,
// against `communities` instead of `tournaments`.
export async function checkCommunitySlugAvailable(slug: string, excludeCommunityId?: string): Promise<{ available: boolean }> {
  if (!slug || slug.length < 3) return { available: false };

  const supabase = await createClient();
  let query = supabase.from("communities").select("id").eq("slug", slug).limit(1);
  if (excludeCommunityId) query = query.neq("id", excludeCommunityId);

  const { data, error } = await query;
  if (error) return { available: false };
  return { available: (data?.length ?? 0) === 0 };
}

type LogoKind = "logo" | "alt" | "pin";

// Supabase's generated Update type rejects a computed `{ [col]: value }`
// patch (it can't tell which column that resolves to) — build the literal
// patch object explicitly instead.
function logoPatch(kind: LogoKind, value: string | null): Pick<CommunityRow, "logo_url"> | Pick<CommunityRow, "alt_logo_url"> | Pick<CommunityRow, "pin_logo_url"> {
  if (kind === "logo") return { logo_url: value };
  if (kind === "alt") return { alt_logo_url: value };
  return { pin_logo_url: value };
}

// The community's own logo, alternative logo, or map-pin logo — stored as
// `${communityId}/logo.webp` / `/alt.webp` / `/pin.webp` in the public
// `community-logos` bucket, same shape as uploadTournamentThumbnail.
// Callable as soon as the community row exists: immediately from Settings,
// or right after creation from the New wizard (see CreateCommunityWizard's
// submit — the file is held in memory and only uploaded once a real
// community id comes back).
export async function uploadCommunityLogo(
  communityId: string,
  kind: LogoKind,
  formData: FormData
): Promise<{ status: "success" | "error"; message?: string; url?: string }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { status: "error", message: "No file provided." };
  if (file.type !== "image/webp") return { status: "error", message: "Image must be converted to WebP before upload." };
  if (file.size > MAX_LOGO_UPLOAD_BYTES) return { status: "error", message: "Image is too large." };

  const supabase = await createClient();
  const path = `${communityId}/${kind}.webp`;

  const { error: uploadError } = await supabase.storage
    .from("community-logos")
    .upload(path, file, { upsert: true, contentType: "image/webp" });
  if (uploadError) return { status: "error", message: uploadError.message };

  const { data: publicUrlData } = supabase.storage.from("community-logos").getPublicUrl(path);
  const url = `${publicUrlData.publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase
    .from("communities")
    .update(logoPatch(kind, url))
    .eq("id", communityId);
  if (updateError) return { status: "error", message: updateError.message };

  return { status: "success", url };
}

// "Use community logo" checkbox on the Alternative Logo / Pin Location Logo
// fields — reuses the already-uploaded logo's URL rather than storing the
// file twice. Mirrors applySquareThumbnailAsBanner.
export async function applyCommunityLogoAs(
  communityId: string,
  kind: "alt" | "pin"
): Promise<{ status: "success" | "error"; message?: string; url?: string | null }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { data: community } = await supabase.from("communities").select("logo_url").eq("id", communityId).maybeSingle();
  if (!community) return { status: "error", message: "Community not found." };

  const { error } = await supabase
    .from("communities")
    .update(logoPatch(kind, community.logo_url))
    .eq("id", communityId);
  if (error) return { status: "error", message: error.message };

  return { status: "success", url: community.logo_url };
}

// Unchecking "Use community logo" (Settings only — the New wizard doesn't
// have anything to clear yet) — clears the derived value back to unset
// rather than leaving it pointing at the main logo. Mirrors
// clearTournamentBanner.
export async function clearCommunityLogoVariant(communityId: string, kind: "alt" | "pin"): Promise<{ status: "success" | "error"; message?: string }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("communities")
    .update(logoPatch(kind, null))
    .eq("id", communityId);
  if (error) return { status: "error", message: error.message };

  return { status: "success" };
}
