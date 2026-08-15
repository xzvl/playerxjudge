"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import type { RoleActionState } from "@/lib/validations/roles";
import type { TournamentAnnouncement, TournamentReportStatus, TournamentStation } from "@/lib/types/database";

function workspacePath(slug: string, page: string) {
  return `/account/organizer/tournament/${slug}/${page}`;
}

// Appends one entry to a tournament's activity Log. Self-contained (opens
// its own client, checked against the same organizer-or-admin RLS policy
// everything else here uses) so it can be called from any other action
// file after a meaningful event — participant added/removed, group/final
// stage started or ended, tournament completed, announcement posted — as a
// fire-and-forget side effect. Never throws: a log write failing shouldn't
// fail the action that triggered it, so errors are swallowed.
export async function logTournamentEvent(tournamentId: string, actor: string, action: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("tournament_log_entries").insert({ tournament_id: tournamentId, actor, action });
}

export async function postAnnouncement(
  tournamentId: string,
  slug: string,
  message: string
): Promise<RoleActionState & { announcement?: TournamentAnnouncement }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };
  const trimmed = message.trim();
  if (!trimmed) return { status: "error", message: "Write something first." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournament_announcements")
    .insert({ tournament_id: tournamentId, posted_by: user.id, message: trimmed })
    .select()
    .single();
  if (error) return { status: "error", message: error.message };

  await logTournamentEvent(tournamentId, "Organizer", "posted an announcement");

  revalidatePath(workspacePath(slug, "announcements"), "layout");
  revalidatePath(workspacePath(slug, "log"), "layout");
  return { status: "success", announcement: data as TournamentAnnouncement };
}

export async function updateReportStatus(
  reportId: string,
  slug: string,
  status: TournamentReportStatus
): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("tournament_reports").update({ status }).eq("id", reportId);
  if (error) return { status: "error", message: error.message };

  revalidatePath(workspacePath(slug, "reports"), "layout");
  // Also called from the organizer's cross-tournament Reports view
  // (app/account/organizer/reports), which lists this same report — see
  // OrganizerReportsPanel.
  revalidatePath("/account/organizer/reports");
  return { status: "success" };
}

export async function addStation(
  tournamentId: string,
  slug: string,
  name: string
): Promise<RoleActionState & { station?: TournamentStation }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };
  const trimmed = name.trim();
  if (!trimmed) return { status: "error", message: "Give the station a name." };

  const supabase = await createClient();
  const { count } = await supabase
    .from("tournament_stations")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);

  const { data, error } = await supabase
    .from("tournament_stations")
    .insert({ tournament_id: tournamentId, name: trimmed, sort_order: count ?? 0 })
    .select()
    .single();
  if (error) return { status: "error", message: error.message };

  revalidatePath(workspacePath(slug, "stations"), "layout");
  return { status: "success", station: data as TournamentStation };
}

export async function removeStation(stationId: string, slug: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("tournament_stations").delete().eq("id", stationId);
  if (error) return { status: "error", message: error.message };

  revalidatePath(workspacePath(slug, "stations"), "layout");
  return { status: "success" };
}

// `matchId: null` clears the station back to idle with nothing assigned.
export async function assignStationMatch(
  stationId: string,
  slug: string,
  matchId: string | null
): Promise<RoleActionState & { station?: TournamentStation }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournament_stations")
    .update({ current_match_id: matchId, status: matchId === null ? "idle" : "in_progress" })
    .eq("id", stationId)
    .select()
    .single();
  if (error) return { status: "error", message: error.message };

  revalidatePath(workspacePath(slug, "stations"), "layout");
  return { status: "success", station: data as TournamentStation };
}
