"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/supabase/get-user";
import {
  organizerApplicationSchema,
  type OrganizerApplicationInput,
  type RoleActionState,
} from "@/lib/validations/roles";

export async function applyForOrganizer(input: OrganizerApplicationInput): Promise<RoleActionState> {
  if (!isSupabaseConfigured) {
    return { status: "error", message: "Supabase isn't configured yet. Add your project credentials to .env.local (see README)." };
  }

  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/become/organizer");

  const parsed = organizerApplicationSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ subscription_plan: parsed.data.tier })
    .eq("id", user.id);

  if (profileError) {
    return { status: "error", message: profileError.message };
  }

  const { error: roleError } = await supabase
    .from("profile_roles")
    .insert({ profile_id: user.id, role: "organizer", status: "pending" });

  if (roleError && roleError.code !== "23505") {
    return { status: "error", message: roleError.message };
  }

  return {
    status: "success",
    message:
      roleError?.code === "23505"
        ? "You've already applied to become an organizer."
        : "Application submitted! We'll review it shortly.",
  };
}
