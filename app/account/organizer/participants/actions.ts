"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import type { RoleActionState } from "@/lib/validations/roles";

// Organizer (or admin) approving a pending player-link request — see
// LinkPlayerControls on the public player page for the request side.
// Authorization is enforced by RLS ("participant_links_update_organizer_or_admin"
// in 20250101000036_participant_links.sql); getCurrentUser() here is just a
// fast, friendly bail-out, same as the sibling participants actions.
export async function confirmParticipantLink(linkId: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("participant_links")
    .update({ status: "approved", decided_at: new Date().toISOString(), decided_by: user.id })
    .eq("id", linkId);

  if (error) return { status: "error", message: error.message };

  revalidatePath("/account/organizer/participants");
  return { status: "success", message: "Link confirmed." };
}

// Declining a pending request — same "just delete the row" shape as
// withdrawCommunityJudgeRequest/removeCommunityMember, since there's no
// 'declined' status to move to (see the migration's comment).
export async function declineParticipantLink(linkId: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("participant_links").delete().eq("id", linkId);
  if (error) return { status: "error", message: error.message };

  revalidatePath("/account/organizer/participants");
  return { status: "success" };
}
