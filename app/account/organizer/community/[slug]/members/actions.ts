"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import type { RoleActionState } from "@/lib/validations/roles";

function membersPath(slug: string) {
  return `/account/organizer/community/${slug}/members`;
}

// "Accept" on a pending join request — see the Members page's own
// Requests-to-Join filter.
export async function acceptCommunityJoinRequest(profileCommunityId: string, slug: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("profile_communities").update({ status: "approved" }).eq("id", profileCommunityId);
  if (error) return { status: "error", message: error.message };

  revalidatePath(membersPath(slug));
  return { status: "success" };
}

// Used for both "Decline" (a still-pending request) and "Delete" (an
// already-approved member) — both are just removing the membership row;
// only the label differs depending on which state the row was in when the
// organizer clicked it (see CommunityMembersPanel).
export async function removeCommunityMember(profileCommunityId: string, slug: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("profile_communities").delete().eq("id", profileCommunityId);
  if (error) return { status: "error", message: error.message };

  revalidatePath(membersPath(slug));
  return { status: "success" };
}
