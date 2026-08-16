"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/supabase/get-user";
import {
  personalInfoSchema,
  tournamentInfoSchema,
  changePasswordSchema,
  PHOTO_SLOTS,
  MAX_WEBP_UPLOAD_BYTES,
  type PersonalInfoInput,
  type TournamentInfoInput,
  type ChangePasswordInput,
  type SettingsActionState,
  type PhotoSlot,
} from "@/lib/validations/settings";
import type { Profile } from "@/lib/types/database";

const NOT_CONFIGURED: SettingsActionState = {
  status: "error",
  message: "Supabase isn't configured yet. Add your project credentials to .env.local (see README).",
};

export async function updatePersonalInfo(input: PersonalInfoInput): Promise<SettingsActionState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You must be signed in." };

  const parsed = personalInfoSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("profiles")
    .select("social_links")
    .eq("id", user.id)
    .single();

  const socialLinks: Record<string, string> = { ...(existing?.social_links ?? {}) };
  if (parsed.data.facebookName) socialLinks.facebook_name = parsed.data.facebookName;
  else delete socialLinks.facebook_name;
  if (parsed.data.facebookUrl) socialLinks.facebook_url = parsed.data.facebookUrl;
  else delete socialLinks.facebook_url;

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      social_links: socialLinks,
    })
    .eq("id", user.id);

  if (error) return { status: "error", message: error.message };

  revalidatePath("/account/settings");
  return { status: "success", message: "Personal information updated." };
}

export async function updateTournamentInfo(input: TournamentInfoInput): Promise<SettingsActionState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You must be signed in." };

  const parsed = tournamentInfoSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ blader_names: parsed.data.bladerNames, community_id: parsed.data.mainCommunityId || null })
    .eq("id", user.id);

  if (profileError) return { status: "error", message: profileError.message };

  // Diff against what's already there rather than delete-then-reinsert
  // everything — a community that's still selected keeps whatever status an
  // organizer already gave it (see 20250101000032_community_join_requests.sql);
  // re-inserting it here would silently reset an approved membership back to
  // a pending request every time this form is saved. Only genuinely new
  // picks land as a fresh (pending) request; only genuinely removed ones are
  // deleted.
  const { data: existingRows, error: existingError } = await supabase
    .from("profile_communities")
    .select("community_id")
    .eq("profile_id", user.id);
  if (existingError) return { status: "error", message: existingError.message };

  const existingIds = new Set((existingRows ?? []).map((r) => r.community_id));
  const selectedIds = new Set(parsed.data.communityIds);
  const toRemove = [...existingIds].filter((id) => !selectedIds.has(id));
  const toAdd = [...selectedIds].filter((id) => !existingIds.has(id));

  if (toRemove.length > 0) {
    const { error } = await supabase.from("profile_communities").delete().eq("profile_id", user.id).in("community_id", toRemove);
    if (error) return { status: "error", message: error.message };
  }

  if (toAdd.length > 0) {
    const { error } = await supabase.from("profile_communities").insert(
      toAdd.map((communityId) => ({
        profile_id: user.id,
        community_id: communityId,
      }))
    );
    if (error) return { status: "error", message: error.message };
  }

  revalidatePath("/account/settings");
  return { status: "success", message: "Tournament information updated." };
}

export async function changeAccountPassword(input: ChangePasswordInput): Promise<SettingsActionState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) return { status: "error", message: error.message };

  return { status: "success", message: "Password updated." };
}

const PHOTO_COLUMN: Record<PhotoSlot, "main_photo_url" | "full_body_photo_url" | "half_body_photo_url"> = {
  main: "main_photo_url",
  full_body: "full_body_photo_url",
  half_body: "half_body_photo_url",
};

export async function uploadProfilePhoto(slot: PhotoSlot, formData: FormData): Promise<SettingsActionState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  if (!PHOTO_SLOTS.includes(slot)) return { status: "error", message: "Invalid photo slot." };

  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You must be signed in." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "No file provided." };
  }
  if (file.type !== "image/webp") {
    return { status: "error", message: "Photo must be converted to WebP before upload." };
  }
  if (file.size > MAX_WEBP_UPLOAD_BYTES) {
    return { status: "error", message: "Photo is too large." };
  }

  const supabase = await createClient();
  const path = `${user.id}/${slot}.webp`;

  const { error: uploadError } = await supabase.storage
    .from("profile-photos")
    .upload(path, file, { upsert: true, contentType: "image/webp" });

  if (uploadError) return { status: "error", message: uploadError.message };

  const { data: publicUrlData } = supabase.storage.from("profile-photos").getPublicUrl(path);
  const url = `${publicUrlData.publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ [PHOTO_COLUMN[slot]]: url } as Partial<Profile>)
    .eq("id", user.id);

  if (updateError) return { status: "error", message: updateError.message };

  revalidatePath("/account/settings");
  return { status: "success", message: "Photo updated." };
}
