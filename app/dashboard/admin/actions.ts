"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";

export async function decideRoleRequest(requestId: string, decision: "approved" | "rejected") {
  const user = await getCurrentUser();
  if (!user) return;

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("profile_roles")
    .update({ status: decision, decided_at: new Date().toISOString(), decided_by: user.id })
    .eq("id", requestId)
    .select("profile_id, role")
    .single();

  if (!error && updated) {
    await supabase.from("notifications").insert({
      profile_id: updated.profile_id,
      type: "system",
      title: decision === "approved" ? "Application approved" : "Application update",
      body:
        decision === "approved"
          ? `Your ${updated.role} application was approved.`
          : `Your ${updated.role} application was not approved.`,
    });
  }

  revalidatePath("/dashboard/admin");
}
