"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import type { ParticipantLinkInfo } from "@/components/dashboard/organizer/ParticipantLinkControls";
import type { RoleActionState } from "@/lib/validations/roles";

// RLS ("tournament_participants_write_organizer_or_admin",
// 20250101000011_tournament_participants.sql) already covers admin/manager
// platform-wide — these are the admin-oversight counterparts to the
// organizer's own updateParticipant/removeParticipant
// (app/account/organizer/tournament/[slug]/participants/actions.ts), which
// don't filter by tournament ownership themselves but are only ever
// called from a page already scoped to the organizer's own tournament.
export async function adminUpdateParticipant(participantId: string, name: string, teamName: string | null): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };
  if (!name.trim()) return { status: "error", message: "Name is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("tournament_participants")
    .update({ name: name.trim(), team_name: teamName?.trim() || null })
    .eq("id", participantId);
  if (error) return { status: "error", message: error.message };

  revalidatePath("/backend/participants");
  return { status: "success" };
}

export async function adminRemoveParticipant(participantId: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("tournament_participants").delete().eq("id", participantId);
  if (error) return { status: "error", message: error.message };

  revalidatePath("/backend/participants");
  return { status: "success" };
}

// Admin directly linking a roster entry to a registered account — the
// no-approval-needed counterpart to the self-serve "Link Me" + organizer-
// confirm flow (ParticipantLinkActions), for when there's no pending
// request to review but the admin knows (or is told) which account a
// roster entry belongs to. Same already-approved insert autoLinkParticipant
// uses for pre-registration auto-link, allowed by the
// "participant_links_insert_organizer_or_admin" RLS policy
// (20250101000050_preregistration_username.sql) — the difference is this
// one surfaces its errors instead of swallowing them, since it's a
// deliberate admin action rather than a best-effort side effect.
export async function adminLinkParticipant(
  participantId: string,
  tournamentId: string,
  username: string
): Promise<RoleActionState & { link?: ParticipantLinkInfo }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };
  if (!username.trim()) return { status: "error", message: "Enter a username." };

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, username")
    .ilike("username", username.trim())
    .maybeSingle();
  if (!profile) return { status: "error", message: "No account found with that username." };

  const { data: link, error } = await supabase
    .from("participant_links")
    .insert({
      tournament_id: tournamentId,
      participant_id: participantId,
      profile_id: profile.id,
      status: "approved",
      decided_at: new Date().toISOString(),
      decided_by: user.id,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { status: "error", message: "This participant or account is already linked." };
    return { status: "error", message: error.message };
  }

  revalidatePath("/backend/participants");
  return {
    status: "success",
    link: { id: link.id, status: "approved", requesterName: profile.display_name ?? profile.username },
  };
}

// Removes a link (pending or approved) from the "All Participants" table —
// the admin-oversight counterpart to declineParticipantLink
// (app/account/organizer/participants/actions.ts), covered by the same
// "participant_links_delete_own_or_organizer_or_admin" RLS policy.
export async function adminUnlinkParticipant(linkId: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("participant_links").delete().eq("id", linkId);
  if (error) return { status: "error", message: error.message };

  revalidatePath("/backend/participants");
  return { status: "success" };
}
