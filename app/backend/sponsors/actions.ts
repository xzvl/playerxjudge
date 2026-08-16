"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { tierDurationDays } from "@/lib/sponsors/status";
import type { RoleActionState } from "@/lib/validations/roles";
import type { SponsorDonationTier } from "@/lib/types/database";

function revalidateSponsorPaths() {
  revalidatePath("/backend/sponsors");
  revalidatePath("/backend/dashboard");
  revalidatePath("/account/sponsor/dashboard");
}

// The approval step explicitly left "DB-only for now" when sponsor
// listings were built (see 20250101000034_sponsor_listings.sql) — sets
// approval_status *and* computes tier_expires_at from the listing's
// donation_tier (tierDurationDays, lib/sponsors/status.ts), the piece a
// manual Supabase Studio edit would otherwise have to compute by hand.
export async function approveSponsorListing(sponsorId: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { data: sponsor, error: fetchError } = await supabase
    .from("sponsors")
    .select("donation_tier")
    .eq("id", sponsorId)
    .maybeSingle();
  if (fetchError) return { status: "error", message: fetchError.message };
  if (!sponsor) return { status: "error", message: "Sponsor listing not found." };

  const expiresAt = sponsor.donation_tier
    ? new Date(Date.now() + tierDurationDays(sponsor.donation_tier as SponsorDonationTier) * 24 * 60 * 60 * 1000)
    : null;

  const { error } = await supabase
    .from("sponsors")
    .update({ approval_status: "approved", tier_expires_at: expiresAt ? expiresAt.toISOString().slice(0, 10) : null })
    .eq("id", sponsorId);
  if (error) return { status: "error", message: error.message };

  revalidateSponsorPaths();
  return { status: "success" };
}

export async function declineSponsorListing(sponsorId: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("sponsors").update({ approval_status: "declined" }).eq("id", sponsorId);
  if (error) return { status: "error", message: error.message };

  revalidateSponsorPaths();
  return { status: "success" };
}

export interface AdminSponsorEdit {
  companyName: string;
  websiteUrl: string;
  facebookUrl: string;
  donationTier: SponsorDonationTier | "";
  tierExpiresAt: string;
}

// Admin edit — deliberately its own action rather than reusing
// updateSponsorListing (app/account/sponsor/[id]/edit/actions.ts), which
// filters `.eq("profile_id", user.id)` and would silently no-op for a
// listing admin doesn't own even though RLS itself would allow the write.
export async function adminUpdateSponsor(sponsorId: string, input: AdminSponsorEdit): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("sponsors")
    .update({
      company_name: input.companyName.trim(),
      website_url: input.websiteUrl.trim() || null,
      facebook_url: input.facebookUrl.trim() || null,
      donation_tier: input.donationTier || null,
      tier_expires_at: input.tierExpiresAt || null,
    })
    .eq("id", sponsorId);
  if (error) return { status: "error", message: error.message };

  revalidateSponsorPaths();
  return { status: "success" };
}

export async function adminDeleteSponsor(sponsorId: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("sponsors").delete().eq("id", sponsorId);
  if (error) return { status: "error", message: error.message };

  revalidateSponsorPaths();
  return { status: "success" };
}
