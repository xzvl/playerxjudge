"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { SPONSORS_CACHE_TAG } from "@/lib/sponsors/queries";
import { getCurrentUser } from "@/lib/supabase/get-user";
import type { RoleActionState } from "@/lib/validations/roles";
import type { SponsorDonationTier } from "@/lib/types/database";

// Owner-only (see "sponsors_delete_own_or_admin",
// 20250101000034_sponsor_listings.sql).
export async function deleteSponsorListing(sponsorId: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("sponsors").delete().eq("id", sponsorId).eq("profile_id", user.id);
  if (error) return { status: "error", message: error.message };

  revalidateTag(SPONSORS_CACHE_TAG);
  revalidatePath("/account/sponsor/dashboard");
  return { status: "success" };
}

// Resubmits a listing's tier for admin review — same manual "email your
// receipt" verification as a brand-new listing (see SponsorListingForm),
// so this resets `approval_status` back to pending rather than extending
// `tier_expires_at` itself. An admin sets the new expiry once they've
// confirmed the payment (see the migration's comment on why that's a
// Supabase Studio step for now, not an in-app one).
export async function renewSponsorListing(sponsorId: string, tier: SponsorDonationTier): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("sponsors")
    .update({ donation_tier: tier, tier_requested_at: new Date().toISOString(), approval_status: "pending" })
    .eq("id", sponsorId)
    .eq("profile_id", user.id);

  if (error) return { status: "error", message: error.message };

  revalidateTag(SPONSORS_CACHE_TAG);
  revalidatePath("/account/sponsor/dashboard");
  return { status: "success", message: "Renewal submitted — we'll activate it once your donation is confirmed." };
}
