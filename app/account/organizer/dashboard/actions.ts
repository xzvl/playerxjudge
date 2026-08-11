"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";

export async function decideCommunityJudge(assignmentId: string, decision: "approved" | "removed") {
  const user = await getCurrentUser();
  if (!user) return;

  const supabase = await createClient();
  await supabase
    .from("community_judges")
    .update({ status: decision, decided_at: new Date().toISOString(), decided_by: user.id })
    .eq("id", assignmentId);

  revalidatePath("/account/organizer/dashboard");
}

export async function archiveTournament(tournamentId: string, archived: boolean) {
  const user = await getCurrentUser();
  if (!user) return;

  const supabase = await createClient();
  await supabase
    .from("tournaments")
    .update({ is_archived: archived })
    .eq("id", tournamentId)
    .eq("organizer_id", user.id);

  revalidatePath("/account/organizer/tournament");
}
