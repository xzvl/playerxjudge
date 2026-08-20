"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { MAX_THUMBNAIL_UPLOAD_BYTES } from "@/lib/validations/tournament-wizard";
import type { RoleActionState } from "@/lib/validations/roles";
import type { Profile } from "@/lib/types/database";

// Prefills the Pre-register popup (PreRegisterDialog) for a signed-in
// visitor from their own profile, so they don't retype what's already on
// file. Returns null for a guest with no session — the dialog just leaves
// the fields blank in that case, same as before.
export async function getPreRegisterPrefill(): Promise<{ fullName: string; bladerName: string; facebookName: string } | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("display_name, first_name, last_name, blader_names, social_links")
    .eq("id", user.id)
    .maybeSingle();
  const profile = data as Pick<Profile, "display_name" | "first_name" | "last_name" | "blader_names" | "social_links"> | null;
  if (!profile) return null;

  const fullName = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || profile.display_name;
  return {
    fullName,
    bladerName: profile.blader_names?.[0] ?? "",
    facebookName: profile.social_links?.facebook_name ?? "",
  };
}

// Guest pre-registration payment screenshot — uploaded before submit (see
// PreRegisterDialog's "Advance Payment" checkbox), same client-side
// JPG/PNG→WebP conversion as ThumbnailUploadField, but stored in its own
// public bucket since the uploader has no account/organizer session (see
// supabase/migrations/20250101000021_preregistration_payment_screenshot.sql).
// No `getCurrentUser()` gate here — this is deliberately a guest-facing
// action.
export async function uploadPreRegistrationPaymentScreenshot(
  tournamentId: string,
  formData: FormData
): Promise<{ status: "success" | "error"; message?: string; url?: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { status: "error", message: "No file provided." };
  if (file.type !== "image/webp") return { status: "error", message: "Image must be converted to WebP before upload." };
  if (file.size > MAX_THUMBNAIL_UPLOAD_BYTES) return { status: "error", message: "Image is too large." };

  const supabase = await createClient();
  const path = `${tournamentId}/${crypto.randomUUID()}.webp`;

  const { error: uploadError } = await supabase.storage
    .from("preregistration-payments")
    .upload(path, file, { contentType: "image/webp" });
  if (uploadError) return { status: "error", message: uploadError.message };

  const { data: publicUrlData } = supabase.storage.from("preregistration-payments").getPublicUrl(path);
  return { status: "success", url: publicUrlData.publicUrl };
}

// Guest pre-registration — no account required, see the Pre-register popup
// (components/tournaments/PreRegisterDialog.tsx). Deliberately not the
// account-bound `registrations` table; this is lead-capture data the
// organizer can read back, not a real roster entry — see
// supabase/migrations/20250101000020_preregistration_payment.sql.
export async function submitPreRegistration(
  tournamentId: string,
  input: {
    fullName: string;
    bladerName: string;
    facebookName: string;
    hidePublic: boolean;
    advancePayment: boolean;
    paymentScreenshotUrl: string | null;
  }
): Promise<RoleActionState> {
  const fullName = input.fullName.trim();
  const bladerName = input.bladerName.trim();
  const facebookName = input.facebookName.trim();

  if (!fullName || !bladerName || !facebookName) {
    return { status: "error", message: "Full Name, Blader Name, and Facebook Name are all required." };
  }
  if (input.advancePayment && !input.paymentScreenshotUrl) {
    return { status: "error", message: "Upload a payment screenshot to confirm your advance payment." };
  }

  const supabase = await createClient();

  // Captured from the submitter's own session, never from client input — so
  // a guest can't type someone else's username into a hidden field to hijack
  // their account link. null for an anonymous guest, same as always. See the
  // organizer-side auto-link this powers: addPreRegisteredParticipant
  // (pre-register/actions.ts) and bulkAddParticipants (participants/actions.ts).
  const user = await getCurrentUser();
  let username: string | null = null;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
    username = profile?.username ?? null;
  }

  const { error } = await supabase.from("tournament_preregistrations").insert({
    tournament_id: tournamentId,
    full_name: fullName,
    blader_name: bladerName,
    facebook_name: facebookName,
    hide_public: input.hidePublic,
    advance_payment: input.advancePayment,
    payment_screenshot_url: input.advancePayment ? input.paymentScreenshotUrl : null,
    username,
  });

  if (error) return { status: "error", message: error.message };
  return { status: "success", message: "You're pre-registered! See you at the tournament." };
}
