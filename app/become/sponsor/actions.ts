"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/supabase/get-user";
import {
  sponsorApplicationSchema,
  type SponsorApplicationInput,
  type RoleActionState,
} from "@/lib/validations/roles";

export async function applyForSponsor(input: SponsorApplicationInput): Promise<RoleActionState> {
  if (!isSupabaseConfigured) {
    return { status: "error", message: "Supabase isn't configured yet. Add your project credentials to .env.local (see README)." };
  }

  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/become/sponsor");

  const parsed = sponsorApplicationSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();

  const { error: sponsorError } = await supabase.from("sponsors").upsert(
    {
      profile_id: user.id,
      company_name: parsed.data.companyName,
      website_url: parsed.data.websiteUrl || null,
      logo_url: parsed.data.logoUrl || null,
    },
    { onConflict: "profile_id" }
  );

  if (sponsorError) {
    return { status: "error", message: sponsorError.message };
  }

  const { error: roleError } = await supabase
    .from("profile_roles")
    .insert({ profile_id: user.id, role: "sponsor", status: "pending" });

  if (roleError && roleError.code !== "23505") {
    return { status: "error", message: roleError.message };
  }

  return {
    status: "success",
    message:
      roleError?.code === "23505"
        ? "You've already applied to become a sponsor."
        : "Application submitted! We'll review it shortly.",
  };
}
