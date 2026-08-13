"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import type { RoleActionState } from "@/lib/validations/roles";
import type { Judge } from "@/lib/types/database";

function stationsPath(slug: string) {
  return `/account/organizer/tournament/${slug}/stations`;
}

// Invites a judge to this tournament — a pending `judges` row plus a
// notification the judge sees on the bell / at /account/player/notifications
// (see respondToJudgeInvite in app/account/notifications-actions.ts, which
// they use to accept/decline). `tournamentTitle` is passed in rather than
// re-fetched — the Stations page already has it.
export async function inviteJudge(
  tournamentId: string,
  slug: string,
  judgeId: string,
  tournamentTitle: string
): Promise<RoleActionState & { judge?: Judge }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();

  const { data: organizerProfile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  const organizerName = organizerProfile?.display_name ?? "The organizer";

  const { data, error } = await supabase
    .from("judges")
    .insert({ tournament_id: tournamentId, judge_id: judgeId, status: "pending" })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return { status: "error", message: "This judge has already been invited." };
    return { status: "error", message: error.message };
  }

  const judge = data as Judge;

  const { error: notifyError } = await supabase.from("notifications").insert({
    profile_id: judgeId,
    type: "judge_invite",
    title: "Judge invitation",
    body: `${organizerName} invited you to judge "${tournamentTitle}".`,
    link: `/account/player/notifications?respond=${judge.id}`,
  });

  revalidatePath(stationsPath(slug));

  // The judges row is real either way — surface this rather than swallow
  // it, so a broken notification doesn't look like a broken invite.
  if (notifyError) {
    return { status: "error", message: `Judge added, but they weren't notified: ${notifyError.message}`, judge };
  }
  return { status: "success", judge };
}

// Removes a judge from the tournament's roster entirely (organizer's "X" on
// the roster list) — a hard delete, not a status change, so it also frees
// up whichever station they were assigned to.
export async function removeJudge(judgeRowId: string, slug: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("judges").delete().eq("id", judgeRowId);
  if (error) return { status: "error", message: error.message };

  revalidatePath(stationsPath(slug));
  return { status: "success" };
}

// The one action behind every station drag: assigning a roster judge who
// isn't stationed yet, moving a stationed judge to a different station, and
// swapping two stationed judges are all the same operation from here.
//
// Ordering matters — the partial unique index on `judges.station_id` (see
// 20250101000024_tournament_judges.sql) is checked per-statement, so the
// target station must be vacated *before* the dragged judge claims it, and
// the bumped occupant (if any) can only move into the dragged judge's old
// spot *after* that update has actually freed it.
export async function assignJudgeToStation(judgeRowId: string, stationId: string, slug: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();

  const [{ data: dragged, error: draggedError }, { data: occupant, error: occupantError }] = await Promise.all([
    supabase.from("judges").select("id, station_id").eq("id", judgeRowId).maybeSingle(),
    supabase.from("judges").select("id, station_id").eq("station_id", stationId).maybeSingle(),
  ]);
  if (draggedError) return { status: "error", message: draggedError.message };
  if (occupantError) return { status: "error", message: occupantError.message };
  if (!dragged) return { status: "error", message: "That judge is no longer on this tournament's roster." };
  if (occupant && occupant.id === dragged.id) return { status: "success" }; // already there

  const oldStationOfDragged = dragged.station_id;

  if (occupant) {
    const { error } = await supabase.from("judges").update({ station_id: null }).eq("id", occupant.id);
    if (error) return { status: "error", message: error.message };
  }

  {
    const { error } = await supabase.from("judges").update({ station_id: stationId }).eq("id", dragged.id);
    if (error) return { status: "error", message: error.message };
  }

  if (occupant && oldStationOfDragged) {
    const { error } = await supabase.from("judges").update({ station_id: oldStationOfDragged }).eq("id", occupant.id);
    if (error) return { status: "error", message: error.message };
  }

  revalidatePath(stationsPath(slug));
  return { status: "success" };
}

// The "x" on a station's assigned-judge chip — sends them back to the
// roster without removing them from the tournament.
export async function unassignJudgeFromStation(judgeRowId: string, slug: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("judges").update({ station_id: null }).eq("id", judgeRowId);
  if (error) return { status: "error", message: error.message };

  revalidatePath(stationsPath(slug));
  return { status: "success" };
}
