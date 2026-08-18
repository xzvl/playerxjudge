"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/supabase/get-user";
import type { RoleActionState } from "@/lib/validations/roles";

// Same request as /become/judge's applyForJudge (profile_roles insert,
// pending review) — a separate action since this flow lives inside the
// signed-in account area (with its own BeyZ ID Verification step, see
// JudgeApplyForm) and revalidates/redirects relative to here instead of
// the public marketing page. The BeyZ ID itself isn't submitted here — the
// uploader (JudgeBeyzIdUploader, reused as-is) saves it straight to the
// profile the moment a file's picked, same as it already does on
// /account/judge/profile; this only records the actual role request.
export async function applyForJudgeFromAccount(): Promise<RoleActionState> {
  if (!isSupabaseConfigured) {
    return { status: "error", message: "Supabase isn't configured yet. Add your project credentials to .env.local (see README)." };
  }

  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/judge/apply");

  const supabase = await createClient();
  const { error } = await supabase.from("profile_roles").insert({ profile_id: user.id, role: "judge", status: "pending" });

  if (error && error.code !== "23505") {
    return { status: "error", message: error.message };
  }

  revalidatePath("/account/judge/apply");
  revalidatePath("/account", "layout");

  return {
    status: "success",
    message: error?.code === "23505" ? "You've already applied to become a judge." : "Application submitted! We'll review it shortly.",
  };
}
