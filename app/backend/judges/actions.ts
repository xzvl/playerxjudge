"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import type { RoleActionState } from "@/lib/validations/roles";
import type { BeyzIdStatus } from "@/lib/types/database";

// The admin review this was left "DB-only for now" waiting on when BeyZ ID
// verification was built (see 20250101000035_judge_beyz_id.sql) — RLS
// ("profiles_update_own_or_admin") already covers admin/manager.
async function decideBeyzId(profileId: string, status: BeyzIdStatus): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ beyz_id_status: status }).eq("id", profileId);
  if (error) return { status: "error", message: error.message };

  revalidatePath("/backend/judges");
  revalidatePath("/backend/dashboard");
  return { status: "success" };
}

export async function approveBeyzId(profileId: string): Promise<RoleActionState> {
  return decideBeyzId(profileId, "approved");
}

export async function declineBeyzId(profileId: string): Promise<RoleActionState> {
  return decideBeyzId(profileId, "declined");
}

// Revokes the judge role (deletes the profile_roles row) — reversible via
// re-applying at /become/judge, same shape as removeOrganizerRole.
export async function removeJudgeRole(roleRowId: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("profile_roles").delete().eq("id", roleRowId).eq("role", "judge");
  if (error) return { status: "error", message: error.message };

  revalidatePath("/backend/judges");
  return { status: "success" };
}
