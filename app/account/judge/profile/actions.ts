"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { MAX_WEBP_UPLOAD_BYTES } from "@/lib/validations/settings";

// The judge's BeyZ ID (generated at https://bey-z-generation.web.app/) —
// reuses the existing `profile-photos` bucket (see the migration's
// comment), stored at `${profileId}/beyz-id.webp`. Every (re)upload resets
// review back to pending — an admin approves it manually for now (see
// 20250101000035_judge_beyz_id.sql).
export async function uploadJudgeBeyzId(formData: FormData): Promise<{ status: "success" | "error"; message?: string; url?: string }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { status: "error", message: "No file provided." };
  if (file.type !== "image/webp") return { status: "error", message: "Image must be converted to WebP before upload." };
  if (file.size > MAX_WEBP_UPLOAD_BYTES) return { status: "error", message: "Image is too large." };

  const supabase = await createClient();
  const path = `${user.id}/beyz-id.webp`;

  const { error: uploadError } = await supabase.storage
    .from("profile-photos")
    .upload(path, file, { upsert: true, contentType: "image/webp" });
  if (uploadError) return { status: "error", message: uploadError.message };

  const { data: publicUrlData } = supabase.storage.from("profile-photos").getPublicUrl(path);
  const url = `${publicUrlData.publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ beyz_id_url: url, beyz_id_status: "pending" })
    .eq("id", user.id);
  if (updateError) return { status: "error", message: updateError.message };

  revalidatePath("/account/judge/profile");
  return { status: "success", url };
}
