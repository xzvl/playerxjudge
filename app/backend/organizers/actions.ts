"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import type { RoleActionState } from "@/lib/validations/roles";
import type { SubscriptionPlan } from "@/lib/types/database";

// RLS ("profiles_update_own_or_admin") already covers admin/manager here —
// see is_admin_or_manager() and profile_roles_update_staff for the write
// path this whole section relies on.
export async function updateOrganizerTier(profileId: string, tier: SubscriptionPlan): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ subscription_plan: tier }).eq("id", profileId);
  if (error) return { status: "error", message: error.message };

  revalidatePath("/backend/organizers");
  return { status: "success" };
}

// Revokes the organizer role outright (deletes the profile_roles row) —
// reversible, they can re-apply from /become/organizer. Communities they
// already own are untouched, same as today's owner/admin delete story.
export async function removeOrganizerRole(roleRowId: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("profile_roles").delete().eq("id", roleRowId).eq("role", "organizer");
  if (error) return { status: "error", message: error.message };

  revalidatePath("/backend/organizers");
  return { status: "success" };
}
