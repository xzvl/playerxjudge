"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import type { RoleActionState } from "@/lib/validations/roles";

// The judge console's "Sign Out" nav item — ends the real auth session
// (same call DashboardShell's own Sign Out uses) and lands back on the
// tournament's public details page rather than /login, since that's what
// "exiting" this console means for someone who was just here to judge.
export async function signOutJudgeSession(slug: string) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/tournaments/${slug}`);
}

// The console's own "stadium" picker (the header field, and the popup
// shown when nothing's picked yet) — lets whoever's running the console
// claim a tournament_stations row as their own, without waiting on the
// organizer's Stations page drag-and-drop. The organizer has no `judges`
// row of their own, so their pick lives on `tournaments.organizer_station_id`
// instead; a judge's pick reuses the same `judges.station_id` the Stations
// page already assigns, including its "one judge per station" rule (bumping
// whoever else is there).
export async function setOwnStation(slug: string, stationId: string | null): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("id, organizer_id")
    .eq("slug", slug)
    .maybeSingle();
  if (tournamentError) return { status: "error", message: tournamentError.message };
  if (!tournament) return { status: "error", message: "Tournament not found." };

  if (tournament.organizer_id === user.id) {
    const { error } = await supabase.from("tournaments").update({ organizer_station_id: stationId }).eq("id", tournament.id);
    if (error) return { status: "error", message: error.message };
    revalidatePath(`/tournaments/${slug}/judge`);
    return { status: "success" };
  }

  const { data: judgeRow, error: judgeError } = await supabase
    .from("judges")
    .select("id")
    .eq("tournament_id", tournament.id)
    .eq("judge_id", user.id)
    .eq("status", "approved")
    .maybeSingle();
  if (judgeError) return { status: "error", message: judgeError.message };
  if (!judgeRow) return { status: "error", message: "You're not an approved judge for this tournament." };

  if (stationId) {
    // Vacate whoever else is there first — the partial unique index on
    // `judges.station_id` only allows one judge per station at a time.
    await supabase.from("judges").update({ station_id: null }).eq("station_id", stationId).neq("id", judgeRow.id);
  }
  const { error } = await supabase.from("judges").update({ station_id: stationId }).eq("id", judgeRow.id);
  if (error) return { status: "error", message: error.message };

  revalidatePath(`/tournaments/${slug}/judge`);
  revalidatePath(`/account/organizer/tournament/${slug}/stations`);
  return { status: "success" };
}

// Screenshots can be considerably heavier than the thumbnail/photo uploads
// elsewhere (a whole console page, not a cropped square) — same WebP-only
// rule as those, just a looser cap.
const MAX_MATCH_SCREENSHOT_BYTES = 4 * 1024 * 1024;

// Uploads the Submit Result screenshot captured client-side (see
// lib/images/screenshot.ts) to the match-screenshots bucket, one object per
// match — `${tournamentId}/${matchId}.webp`, overwritten on re-submit.
// Returns just the public URL; the caller (JudgeConsole) folds it into the
// same submitJudgedMatchResult payload that writes the score itself.
// Authorization is enforced by the bucket's own RLS (organizer or approved
// judge of this tournament) rather than re-checked here.
export async function uploadMatchScreenshot(
  tournamentId: string,
  matchId: string,
  formData: FormData
): Promise<{ status: "success" | "error"; message?: string; url?: string }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { status: "error", message: "No screenshot captured." };
  if (file.type !== "image/webp") return { status: "error", message: "Screenshot must be converted to WebP before upload." };
  if (file.size > MAX_MATCH_SCREENSHOT_BYTES) return { status: "error", message: "Screenshot is too large." };

  const supabase = await createClient();
  const path = `${tournamentId}/${matchId}.webp`;

  const { error: uploadError } = await supabase.storage
    .from("match-screenshots")
    .upload(path, file, { upsert: true, contentType: "image/webp" });
  if (uploadError) return { status: "error", message: uploadError.message };

  const { data: publicUrlData } = supabase.storage.from("match-screenshots").getPublicUrl(path);
  return { status: "success", url: `${publicUrlData.publicUrl}?v=${Date.now()}` };
}
