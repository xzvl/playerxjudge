"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { sponsorListingSchema, type SponsorListingInput, type RoleActionState } from "@/lib/validations/roles";

export async function createSponsorListing(input: SponsorListingInput): Promise<RoleActionState & { id?: string }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in to create a sponsor listing." };

  const parsed = sponsorListingSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors, message: "Check the highlighted fields." };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("sponsors")
    .insert({
      profile_id: user.id,
      company_name: data.sponsorName,
      website_url: data.websiteUrl || null,
      facebook_url: data.facebookUrl || null,
      donation_tier: data.donationTier,
      tier_requested_at: new Date().toISOString(),
      approval_status: "pending",
    })
    .select("id")
    .single();

  if (error) return { status: "error", message: error.message };

  return { status: "success", id: inserted.id };
}
