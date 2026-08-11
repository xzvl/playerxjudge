"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/supabase/get-user";
import {
  sponsorApplicationSchema,
  type SponsorApplicationInput,
  type RoleActionState,
} from "@/lib/validations/roles";

export async function updateSponsorProfile(input: SponsorApplicationInput): Promise<RoleActionState> {
  if (!isSupabaseConfigured) {
    return { status: "error", message: "Supabase isn't configured yet." };
  }

  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You must be signed in." };

  const parsed = sponsorApplicationSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("sponsors")
    .update({
      company_name: parsed.data.companyName,
      website_url: parsed.data.websiteUrl || null,
      logo_url: parsed.data.logoUrl || null,
    })
    .eq("profile_id", user.id);

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/account/sponsor/dashboard");
  return { status: "success", message: "Sponsor profile updated." };
}
