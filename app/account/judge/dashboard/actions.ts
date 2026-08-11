"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/supabase/get-user";

export async function requestCommunityJudgeAssignment(communityId: string): Promise<void> {
  if (!isSupabaseConfigured) return;

  const user = await getCurrentUser();
  if (!user) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("community_judges")
    .insert({ community_id: communityId, judge_id: user.id, status: "pending" });

  if (error && error.code !== "23505") {
    throw new Error(error.message);
  }

  revalidatePath("/account/judge/dashboard");
}

export async function withdrawCommunityJudgeRequest(communityId: string): Promise<void> {
  if (!isSupabaseConfigured) return;

  const user = await getCurrentUser();
  if (!user) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("community_judges")
    .delete()
    .eq("community_id", communityId)
    .eq("judge_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/account/judge/dashboard");
}
