"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { sponsorListingSchema, type SponsorListingInput, type RoleActionState } from "@/lib/validations/roles";

export async function updateSponsorListing(sponsorId: string, input: SponsorListingInput): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const parsed = sponsorListingSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors, message: "Check the highlighted fields." };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("sponsors")
    .update({
      company_name: data.sponsorName,
      website_url: data.websiteUrl || null,
      facebook_url: data.facebookUrl || null,
      donation_tier: data.donationTier,
    })
    .eq("id", sponsorId)
    .eq("profile_id", user.id);

  if (error) return { status: "error", message: error.message };

  revalidatePath("/account/sponsor/dashboard");
  return { status: "success", message: "Sponsor listing updated." };
}
