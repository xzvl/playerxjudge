"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isCurrentUserStaff } from "@/lib/supabase/get-user";
import { SITE_CONTENT_CACHE_TAG } from "@/lib/site-content/queries";
import { queueImageVariants } from "@/lib/images/optimize";
import { SECTION_NORMALIZERS, SITE_SECTION_KEYS, type SiteContent, type SiteSectionKey } from "@/lib/site-content/schema";

export interface ContentActionState {
  status: "success" | "error";
  message?: string;
  url?: string;
  // saveSiteSection: the section as stored (after normalization).
  value?: unknown;
}

const fail = (message: string): ContentActionState => ({ status: "error", message });

// Saves one section (branding, header, hero, footer, maintenance) of the
// site content. The value is normalized first, so only known fields with
// safe values are stored. RLS ("site_settings_write_staff") is the real gate.
export async function saveSiteSection<K extends SiteSectionKey>(key: K, value: SiteContent[K]): Promise<ContentActionState> {
  const user = await getCurrentUser();
  if (!user) return fail("You need to be signed in.");
  if (!(await isCurrentUserStaff())) return fail("Only staff can edit site content.");
  if (!SITE_SECTION_KEYS.includes(key)) return fail("Unknown section.");

  const normalized = SECTION_NORMALIZERS[key](value);
  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key, value: normalized, updated_by: user.id }, { onConflict: "key" });
  if (error) {
    if (error.code === "42P01" || /site_settings/.test(error.message)) {
      return fail("The site_settings table doesn't exist yet. Apply migration 20250101000060 first.");
    }
    return fail(error.message);
  }

  revalidateTag(SITE_CONTENT_CACHE_TAG);
  // Header/footer/branding render in the root layout on every page.
  revalidatePath("/", "layout");
  return { status: "success", message: "Saved. Changes are live.", value: normalized };
}

const ASSET_TYPES: Record<string, string> = {
  "image/webp": "webp",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
};

// Server actions accept up to 1 MB by default.
const MAX_ASSET_BYTES = 1024 * 1024;

// Uploads a branding/hero image to the public `site-assets` bucket and
// returns its URL. A new file name every time, so browsers and CDNs never
// serve a stale copy; the caller saves the URL into its section.
export async function uploadSiteAsset(slot: string, formData: FormData): Promise<ContentActionState> {
  if (!(await isCurrentUserStaff())) return fail("Only staff can upload site assets.");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("No file provided.");
  const ext = ASSET_TYPES[file.type];
  if (!ext) return fail("Use a WebP, PNG, JPG, SVG or ICO file.");
  if (file.size > MAX_ASSET_BYTES) return fail("File must be 1 MB or smaller.");

  const safeSlot = slot.replace(/[^a-z0-9-]/gi, "").slice(0, 40) || "asset";
  const path = `${safeSlot}/${Date.now()}.${ext}`;

  const supabase = await createClient();
  const { error } = await supabase.storage.from("site-assets").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return fail(error.message);
  // Icons and SVGs are used as-is; raster images get size variants.
  if (ext === "webp") queueImageVariants("site-assets", path);

  const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
  return { status: "success", url: data.publicUrl };
}
