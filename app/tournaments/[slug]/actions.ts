"use server";

import { createClient } from "@/lib/supabase/server";
import { MAX_THUMBNAIL_UPLOAD_BYTES } from "@/lib/validations/tournament-wizard";
import type { RoleActionState } from "@/lib/validations/roles";

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
  const { error } = await supabase.from("tournament_preregistrations").insert({
    tournament_id: tournamentId,
    full_name: fullName,
    blader_name: bladerName,
    facebook_name: facebookName,
    hide_public: input.hidePublic,
    advance_payment: input.advancePayment,
    payment_screenshot_url: input.advancePayment ? input.paymentScreenshotUrl : null,
  });

  if (error) return { status: "error", message: error.message };
  return { status: "success", message: "You're pre-registered! See you at the tournament." };
}
