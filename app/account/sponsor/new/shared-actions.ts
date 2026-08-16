"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { MAX_LOGO_UPLOAD_BYTES } from "@/lib/validations/community";

// A sponsor listing's logo — stored as `${sponsorId}/logo.webp` in the
// public `sponsor-logos` bucket, same shape as uploadCommunityLogo (see
// app/account/organizer/community/shared-actions.ts) but with just the one
// image slot (no alt/pin variants). Callable as soon as the sponsors row
// exists: immediately from the Edit page, or right after creation from the
// New form — see SponsorListingForm's submit.
export async function uploadSponsorLogo(
  sponsorId: string,
  formData: FormData
): Promise<{ status: "success" | "error"; message?: string; url?: string }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { status: "error", message: "No file provided." };
  if (file.type !== "image/webp") return { status: "error", message: "Image must be converted to WebP before upload." };
  if (file.size > MAX_LOGO_UPLOAD_BYTES) return { status: "error", message: "Image is too large." };

  const supabase = await createClient();
  const path = `${sponsorId}/logo.webp`;

  const { error: uploadError } = await supabase.storage
    .from("sponsor-logos")
    .upload(path, file, { upsert: true, contentType: "image/webp" });
  if (uploadError) return { status: "error", message: uploadError.message };

  const { data: publicUrlData } = supabase.storage.from("sponsor-logos").getPublicUrl(path);
  const url = `${publicUrlData.publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase.from("sponsors").update({ logo_url: url }).eq("id", sponsorId);
  if (updateError) return { status: "error", message: updateError.message };

  return { status: "success", url };
}
