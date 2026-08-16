"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import type { RoleActionState } from "@/lib/validations/roles";

// Migrated from app/dashboard/admin/actions.ts's decideRoleRequest —
// RLS ("profile_roles_update_staff", 20250101000008_role_approvals.sql)
// already covers both admin and an approved manager, this just adds the
// notification + path bookkeeping.
async function decideRoleRequest(requestId: string, decision: "approved" | "rejected"): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("profile_roles")
    .update({ status: decision, decided_at: new Date().toISOString(), decided_by: user.id })
    .eq("id", requestId)
    .select("profile_id, role")
    .single();

  if (error) return { status: "error", message: error.message };

  await supabase.from("notifications").insert({
    profile_id: updated.profile_id,
    type: "system",
    title: decision === "approved" ? "Application approved" : "Application update",
    body:
      decision === "approved"
        ? `Your ${updated.role} application was approved.`
        : `Your ${updated.role} application was not approved.`,
  });

  revalidatePath("/backend/role-applications");
  revalidatePath("/backend/dashboard");
  return { status: "success" };
}

export async function approveRoleRequest(requestId: string): Promise<RoleActionState> {
  return decideRoleRequest(requestId, "approved");
}

export async function rejectRoleRequest(requestId: string): Promise<RoleActionState> {
  return decideRoleRequest(requestId, "rejected");
}
