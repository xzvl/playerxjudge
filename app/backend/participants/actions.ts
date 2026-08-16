"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
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
