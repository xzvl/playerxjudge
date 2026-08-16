"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import type { RoleActionState } from "@/lib/validations/roles";

// "Link Me" confirm — see LinkPlayerControls. RLS ("participant_links_insert_own")
// already restricts profile_id to the caller; the two unique constraints
// (one active claim per participant, one per profile per tournament) are
// what actually stop a bad request, surfaced here as a friendly message
// rather than a raw 23505.
export async function requestParticipantLink(tournamentId: string, participantId: string, slug: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in to link a player." };

  const supabase = await createClient();
  const { error } = await supabase.from("participant_links").insert({
    tournament_id: tournamentId,
    participant_id: participantId,
    profile_id: user.id,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        status: "error",
        message: "This player is already claimed, or you've already linked a different player in this tournament.",
      };
    }
    return { status: "error", message: error.message };
  }

  revalidatePath(`/tournaments/${slug}/player`);
  return { status: "success", message: "Link request sent — waiting on the organizer to confirm." };
}

// The requester withdrawing their own (pending or approved) link — "Not
// Me" on a pending request never calls this (nothing was created yet), so
// this is only reachable from the cancel-link icon.
export async function cancelParticipantLink(linkId: string, slug: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("participant_links").delete().eq("id", linkId).eq("profile_id", user.id);
  if (error) return { status: "error", message: error.message };

  revalidatePath(`/tournaments/${slug}/player`);
  return { status: "success" };
}
