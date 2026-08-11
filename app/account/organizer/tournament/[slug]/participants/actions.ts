"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { logTournamentEvent } from "@/app/account/organizer/tournament/[slug]/workspace-panels-actions";
import type { TournamentGroup, TournamentParticipant } from "@/lib/types/database";
import type { RoleActionState } from "@/lib/validations/roles";

// Authorization is enforced by RLS (`tournament_*_write_organizer_or_admin`,
// see the 20250101000011 migration) — these actions run as the signed-in
// user, so a non-organizer's writes are rejected at the database, not just
// here. `getCurrentUser()` below is just a fast, friendly bail-out.

function participantsPath(slug: string) {
  return `/account/organizer/tournament/${slug}/participants`;
}

export async function addParticipant(
  tournamentId: string,
  slug: string,
  name: string,
  teamName: string | null
): Promise<RoleActionState & { participant?: TournamentParticipant }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };
  if (!name.trim()) return { status: "error", message: "Name is required." };

  const supabase = await createClient();
  const { data: highestSeed } = await supabase
    .from("tournament_participants")
    .select("seed")
    .eq("tournament_id", tournamentId)
    .order("seed", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("tournament_participants")
    .insert({ tournament_id: tournamentId, seed: (highestSeed?.seed ?? 0) + 1, name: name.trim(), team_name: teamName })
    .select()
    .single();

  if (error) return { status: "error", message: error.message };
  const added = data as TournamentParticipant;
  await logTournamentEvent(tournamentId, "Organizer", `added ${added.team_name ?? added.name} to the roster`);
  revalidatePath(participantsPath(slug));
  return { status: "success", participant: added };
}

export async function bulkAddParticipants(
  tournamentId: string,
  slug: string,
  names: string[],
  isTeam: boolean
): Promise<RoleActionState & { participants?: TournamentParticipant[] }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const cleaned = names.map((n) => n.trim()).filter(Boolean);
  if (cleaned.length === 0) return { status: "error", message: "Nothing to add." };

  const supabase = await createClient();
  const { data: highestSeed } = await supabase
    .from("tournament_participants")
    .select("seed")
    .eq("tournament_id", tournamentId)
    .order("seed", { ascending: false })
    .limit(1)
    .maybeSingle();

  let seed = (highestSeed?.seed ?? 0) + 1;
  const rows = cleaned.map((name) => ({
    tournament_id: tournamentId,
    seed: seed++,
    name,
    team_name: isTeam ? name : null,
  }));

  const { data, error } = await supabase.from("tournament_participants").insert(rows).select();
  if (error) return { status: "error", message: error.message };
  await logTournamentEvent(tournamentId, "Organizer", `bulk-added ${rows.length} participant${rows.length === 1 ? "" : "s"}`);
  revalidatePath(participantsPath(slug));
  return { status: "success", participants: data as TournamentParticipant[] };
}

export async function updateParticipant(
  participantId: string,
  slug: string,
  name: string,
  teamName: string | null
): Promise<RoleActionState & { participant?: TournamentParticipant }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };
  if (!name.trim()) return { status: "error", message: "Name is required." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournament_participants")
    .update({ name: name.trim(), team_name: teamName })
    .eq("id", participantId)
    .select()
    .single();

  if (error) return { status: "error", message: error.message };
  revalidatePath(participantsPath(slug));
  return { status: "success", participant: data as TournamentParticipant };
}

export async function removeParticipant(participantId: string, slug: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("tournament_participants").delete().eq("id", participantId).select().single();

  if (error) return { status: "error", message: error.message };
  if (data) {
    const removed = data as TournamentParticipant;
    await logTournamentEvent(removed.tournament_id, "Organizer", `removed ${removed.team_name ?? removed.name} from the roster`);
  }
  revalidatePath(participantsPath(slug));
  return { status: "success" };
}

// Wipes the entire roster in one go — same underlying delete as
// removeParticipant, just for every participant at once. matches.* FKs are
// ON DELETE SET NULL (see 20250101000013_group_stage_matches.sql), so this
// won't fail once matches exist, it'll just null out their participants —
// the UI gates this behind !tournamentStarted the same way it gates Remove.
export async function clearParticipants(tournamentId: string, slug: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("tournament_participants").delete().eq("tournament_id", tournamentId);
  if (error) return { status: "error", message: error.message };

  await logTournamentEvent(tournamentId, "Organizer", "cleared the participant roster");
  revalidatePath(participantsPath(slug));
  return { status: "success" };
}

export async function shuffleSeeds(
  tournamentId: string,
  slug: string
): Promise<RoleActionState & { participants?: TournamentParticipant[] }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { data: rows, error: fetchError } = await supabase
    .from("tournament_participants")
    .select("*")
    .eq("tournament_id", tournamentId);

  if (fetchError) return { status: "error", message: fetchError.message };
  if (!rows || rows.length === 0) return { status: "success", participants: [] };

  const seeds = rows.map((r) => r.seed);
  for (let i = seeds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [seeds[i], seeds[j]] = [seeds[j], seeds[i]];
  }
  const updates = rows.map((r, i) => ({ ...r, seed: seeds[i] }));

  const { data, error } = await supabase.from("tournament_participants").upsert(updates).select();
  if (error) return { status: "error", message: error.message };

  revalidatePath(participantsPath(slug));
  return { status: "success", participants: (data as TournamentParticipant[]).sort((a, b) => a.seed - b.seed) };
}

// Drag-and-drop reordering within a Manage Groups card — the seed *values*
// held by this exact set of participants don't change (so global seeding
// stays unique/consistent), only which participant holds which seed within
// that set, matching the new drop order.
export async function reorderParticipantSeeds(
  slug: string,
  orderedParticipantIds: string[]
): Promise<RoleActionState & { participants?: TournamentParticipant[] }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };
  if (orderedParticipantIds.length < 2) return { status: "success", participants: [] };

  const supabase = await createClient();
  const { data: rows, error: fetchError } = await supabase
    .from("tournament_participants")
    .select("*")
    .in("id", orderedParticipantIds);
  if (fetchError) return { status: "error", message: fetchError.message };
  if (!rows || rows.length !== orderedParticipantIds.length) {
    return { status: "error", message: "That participant list is out of date — refresh and try again." };
  }

  const seeds = rows.map((r) => r.seed).sort((a, b) => a - b);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const updates = orderedParticipantIds.map((id, i) => ({ ...byId.get(id)!, seed: seeds[i] }));

  const { data, error } = await supabase.from("tournament_participants").upsert(updates).select();
  if (error) return { status: "error", message: error.message };

  revalidatePath(participantsPath(slug));
  return { status: "success", participants: data as TournamentParticipant[] };
}

export async function assignGroupsAutomatically(
  tournamentId: string,
  slug: string,
  participantsPerGroup: number
): Promise<RoleActionState & { groups?: TournamentGroup[]; participants?: TournamentParticipant[] }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { data: participants, error: pErr } = await supabase
    .from("tournament_participants")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("seed");
  if (pErr) return { status: "error", message: pErr.message };

  const { error: delErr } = await supabase.from("tournament_groups").delete().eq("tournament_id", tournamentId);
  if (delErr) return { status: "error", message: delErr.message };

  if (!participants || participants.length === 0) {
    revalidatePath(participantsPath(slug));
    return { status: "success", groups: [], participants: [] };
  }

  const groupCount = Math.max(1, Math.ceil(participants.length / Math.max(1, participantsPerGroup)));
  const labels = Array.from({ length: groupCount }, (_, i) => String.fromCharCode(65 + i));

  const { data: groups, error: gErr } = await supabase
    .from("tournament_groups")
    .insert(labels.map((label, i) => ({ tournament_id: tournamentId, label, sort_order: i })))
    .select();
  if (gErr) return { status: "error", message: gErr.message };

  const createdGroups = groups as TournamentGroup[];
  const updates = participants.map((p, i) => ({ ...p, group_id: createdGroups[i % groupCount].id }));

  const { data: updatedParticipants, error: uErr } = await supabase.from("tournament_participants").upsert(updates).select();
  if (uErr) return { status: "error", message: uErr.message };

  revalidatePath(participantsPath(slug));
  return { status: "success", groups: createdGroups, participants: updatedParticipants as TournamentParticipant[] };
}

export async function addGroup(
  tournamentId: string,
  slug: string
): Promise<RoleActionState & { group?: TournamentGroup }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { data: existing, error: cErr } = await supabase
    .from("tournament_groups")
    .select("label")
    .eq("tournament_id", tournamentId);
  if (cErr) return { status: "error", message: cErr.message };

  const usedLabels = new Set((existing ?? []).map((g) => g.label));
  let i = 0;
  while (usedLabels.has(String.fromCharCode(65 + i))) i++;
  const label = String.fromCharCode(65 + i);

  const { data, error } = await supabase
    .from("tournament_groups")
    .insert({ tournament_id: tournamentId, label, sort_order: existing?.length ?? 0 })
    .select()
    .single();

  if (error) return { status: "error", message: error.message };
  revalidatePath(participantsPath(slug));
  return { status: "success", group: data as TournamentGroup };
}

export async function removeGroup(groupId: string, slug: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("tournament_groups").delete().eq("id", groupId);

  if (error) return { status: "error", message: error.message };
  revalidatePath(participantsPath(slug));
  return { status: "success" };
}

export async function assignParticipantsToGroup(
  groupId: string,
  slug: string,
  participantIds: string[]
): Promise<RoleActionState & { participants?: TournamentParticipant[] }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };
  if (participantIds.length === 0) return { status: "success", participants: [] };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournament_participants")
    .update({ group_id: groupId })
    .in("id", participantIds)
    .select();

  if (error) return { status: "error", message: error.message };
  revalidatePath(participantsPath(slug));
  return { status: "success", participants: data as TournamentParticipant[] };
}

export async function unassignParticipant(
  participantId: string,
  slug: string
): Promise<RoleActionState & { participant?: TournamentParticipant }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournament_participants")
    .update({ group_id: null })
    .eq("id", participantId)
    .select()
    .single();

  if (error) return { status: "error", message: error.message };
  revalidatePath(participantsPath(slug));
  return { status: "success", participant: data as TournamentParticipant };
}

export async function moveParticipantToGroup(
  participantId: string,
  slug: string,
  groupId: string
): Promise<RoleActionState & { participant?: TournamentParticipant }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournament_participants")
    .update({ group_id: groupId })
    .eq("id", participantId)
    .select()
    .single();

  if (error) return { status: "error", message: error.message };
  revalidatePath(participantsPath(slug));
  return { status: "success", participant: data as TournamentParticipant };
}
