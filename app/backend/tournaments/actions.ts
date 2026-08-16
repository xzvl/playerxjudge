"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import type { RoleActionState } from "@/lib/validations/roles";
import type { TournamentStatus } from "@/lib/types/database";

// RLS ("tournaments_update_organizer_or_admin"/"tournaments_delete_organizer_or_admin",
// 20250101000006_functions_and_rls.sql) already covers admin/manager for
// both of these — platform-wide oversight, not tied to organizer_id.
export async function adminUpdateTournamentStatus(tournamentId: string, status: TournamentStatus): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("tournaments").update({ status }).eq("id", tournamentId);
  if (error) return { status: "error", message: error.message };

  revalidatePath("/backend/tournaments");
  return { status: "success" };
}

export async function adminDeleteTournament(tournamentId: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("tournaments").delete().eq("id", tournamentId);
  if (error) return { status: "error", message: error.message };

  revalidatePath("/backend/tournaments");
  return { status: "success" };
}
