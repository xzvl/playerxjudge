"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/supabase/get-user";
import type { RoleActionState } from "@/lib/validations/roles";

export async function applyForJudge(): Promise<RoleActionState> {
  if (!isSupabaseConfigured) {
    return { status: "error", message: "Supabase isn't configured yet. Add your project credentials to .env.local (see README)." };
  }

  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/become/judge");

  const supabase = await createClient();
  const { error } = await supabase
    .from("profile_roles")
    .insert({ profile_id: user.id, role: "judge", status: "pending" });

  if (error && error.code !== "23505") {
    return { status: "error", message: error.message };
  }

  revalidatePath("/become/judge");

  return {
    status: "success",
    message:
      error?.code === "23505"
        ? "You've already applied to become a judge."
        : "Application submitted! We'll review it shortly.",
  };
}
