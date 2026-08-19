"use server";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { getActiveDeckReadOnly, getDeckCombos, type ComboWithParts } from "@/app/account/beyblade/data";
import type { RoleActionState } from "@/lib/validations/roles";

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

// Notifies each side's linked account (if their `tournament_participants`
// row has an *approved* `participant_links` claim) that a judge has just
// picked up their match — called once both sides of a match are actually
// set (see JudgeConsole's startMatchAtStation), not on every single picker
// selection, so it fires once per match rather than once per click. Carries
// enough to walk straight to the right spot: which stadium, which judge,
// and which tournament.
//
// `notifications` RLS has no policy for "judge notifies a linked player" —
// only "notifications_insert_tournament_judge_link" (judge <-> organizer,
// for invites/responses). Same posture as getParticipantComboSlots below:
// independently confirm the caller is actually authorized to judge this
// tournament and that both participants belong to it, *then* reach for the
// service-role client to do the insert RLS itself doesn't cover.
export async function notifySeatedParticipants(
  tournamentId: string,
  slug: string,
  tournamentTitle: string,
  participantAId: string,
  participantBId: string,
  stationName: string | null,
  judgeName: string
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const supabase = await createClient();
  const [{ data: tournamentRow }, { data: judgeRow }, { data: participantRows }] = await Promise.all([
    supabase.from("tournaments").select("organizer_id").eq("id", tournamentId).maybeSingle(),
    supabase.from("judges").select("status").eq("tournament_id", tournamentId).eq("judge_id", user.id).maybeSingle(),
    supabase.from("tournament_participants").select("id").eq("tournament_id", tournamentId).in("id", [participantAId, participantBId]),
  ]);
  const isAuthorized = tournamentRow?.organizer_id === user.id || judgeRow?.status === "approved";
  if (!isAuthorized || (participantRows?.length ?? 0) < 2) return;

  const admin = createAdminClient();
  const { data: links } = await admin
    .from("participant_links")
    .select("profile_id")
    .eq("tournament_id", tournamentId)
    .eq("status", "approved")
    .in("participant_id", [participantAId, participantBId]);
  if (!links || links.length === 0) return;

  const body = stationName
    ? `You're up at ${stationName} for "${tournamentTitle}", judged by ${judgeName}.`
    : `Your match for "${tournamentTitle}" is starting, judged by ${judgeName}.`;

  await admin.from("notifications").insert(
    links.map((link) => ({
      profile_id: link.profile_id,
      type: "match_result" as const,
      title: "You're up!",
      body,
      link: `/tournaments/${slug}/player`,
    }))
  );
}

// A participant's linked account's active-deck combos, in slot order —
// null if they have no *approved* linked account or no active deck yet.
// JudgeConsole fetches this once per side the moment a match is picked and
// snapshots it into that side's PlayerScoreState.comboSlots, so a deck
// edit mid-match doesn't retroactively change which combo an
// already-scored battle recorded (see PlayerScorePanel's mergeBattleLog).
//
// A combo/deck is otherwise fully private (RLS: owning profile only — see
// 20250101000042_beyblade_combos_and_decks.sql), but a judge/organizer
// legitimately needs to read a linked participant's to record which combo
// a battle was played with. That's the *only* reason this reaches for the
// service-role client below — every other query here still goes through
// the normal RLS-respecting one, and only after independently confirming
// the caller is actually authorized to judge this specific tournament and
// that the participant actually belongs to it (participant_links itself
// is already publicly readable, so that lookup doesn't need elevating).
export async function getParticipantComboSlots(tournamentId: string, participantId: string): Promise<(ComboWithParts | null)[] | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const [{ data: tournamentRow }, { data: judgeRow }, { data: participantRow }, { data: link }] = await Promise.all([
    supabase.from("tournaments").select("organizer_id").eq("id", tournamentId).maybeSingle(),
    supabase.from("judges").select("status").eq("tournament_id", tournamentId).eq("judge_id", user.id).maybeSingle(),
    supabase.from("tournament_participants").select("id").eq("id", participantId).eq("tournament_id", tournamentId).maybeSingle(),
    supabase.from("participant_links").select("profile_id").eq("participant_id", participantId).eq("status", "approved").maybeSingle(),
  ]);

  const isAuthorized = tournamentRow?.organizer_id === user.id || judgeRow?.status === "approved";
  if (!isAuthorized || !participantRow || !link) return null;

  const admin = createAdminClient();
  const deck = await getActiveDeckReadOnly(link.profile_id, admin);
  if (!deck) return null;
  return getDeckCombos(deck, link.profile_id, admin);
}
