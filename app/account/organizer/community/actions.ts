"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import type { RoleActionState } from "@/lib/validations/roles";

// Owner-only (mirrors "communities_delete_owner_or_admin" — a staff
// organizer via the `organizers` table can't delete, only the owner or an
// admin can). Tournaments this community hosted aren't deleted with it —
// `tournaments.community_id` is `on delete set null`, so they just become
// independent.
export async function deleteCommunity(communityId: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("communities").delete().eq("id", communityId).eq("owner_id", user.id);
  if (error) return { status: "error", message: error.message };

  revalidatePath("/account/organizer/community");
  return { status: "success" };
}
