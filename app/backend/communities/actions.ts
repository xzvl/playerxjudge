"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import type { RoleActionState } from "@/lib/validations/roles";

function revalidateCommunityPaths(slug?: string) {
  revalidatePath("/backend/communities");
  revalidatePath("/backend/dashboard");
  revalidatePath("/account/organizer/community");
  revalidatePath("/communities");
  if (slug) revalidatePath(`/communities/${slug}`);
}

// Migrated from app/account/admin/communities/actions.ts — RLS
// (communities_update_owner_or_admin) already covers admin/manager.
export async function approveCommunity(communityId: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

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
// own Delete button — there's no separate "rejected" state to keep around.
export async function rejectCommunity(communityId: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("communities").delete().eq("id", communityId);
  if (error) return { status: "error", message: error.message };

  revalidateCommunityPaths();
  return { status: "success" };
}

// Deleting an already-approved community — unlike the organizer's own
// deleteCommunity (app/account/organizer/community/actions.ts), this has
// no `.eq("owner_id", user.id)` filter, relying entirely on RLS
// ("communities_delete_owner_or_admin") to admit an admin/manager deleting
// someone else's community.
export async function adminDeleteCommunity(communityId: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("communities").delete().eq("id", communityId);
  if (error) return { status: "error", message: error.message };

  revalidateCommunityPaths();
  return { status: "success" };
}
