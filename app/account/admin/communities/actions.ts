"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, isAdminProfile } from "@/lib/supabase/get-user";
import type { RoleActionState } from "@/lib/validations/roles";

function revalidateCommunityPaths(slug?: string) {
  revalidatePath("/account/admin/communities");
  revalidatePath("/account/organizer/community");
  revalidatePath("/communities");
  if (slug) revalidatePath(`/communities/${slug}`);
}

// Approve a pending community's application — RLS
// (communities_update_owner_or_admin) already covers admins, this just adds
// the app-layer gate + the "which paths change" bookkeeping.
export async function approveCommunity(communityId: string): Promise<RoleActionState> {
  const profile = await getCurrentProfile();
  if (!isAdminProfile(profile)) return { status: "error", message: "You need to be an admin." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("communities")
    .update({ approval_status: "approved" })
    .eq("id", communityId)
    .select("slug")
    .single();
  if (error) return { status: "error", message: error.message };

  revalidateCommunityPaths(data?.slug);
  return { status: "success" };
}

// Rejecting a pending application removes it outright, same as the owner's
// own Delete button — there's no separate "rejected" state to keep around
// (an organizer who wants to try again just re-applies).
export async function rejectCommunity(communityId: string): Promise<RoleActionState> {
  const profile = await getCurrentProfile();
  if (!isAdminProfile(profile)) return { status: "error", message: "You need to be an admin." };

  const supabase = await createClient();
  const { error } = await supabase.from("communities").delete().eq("id", communityId);
  if (error) return { status: "error", message: error.message };

  revalidateCommunityPaths();
  return { status: "success" };
}
