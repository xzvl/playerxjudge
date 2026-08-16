"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isCurrentUserStaff } from "@/lib/supabase/get-user";
import { manilaLocalToUtcIso } from "@/lib/format";
import {
  createTournamentSchema,
  isTournamentEditable,
  resolveBracketFormat,
  toFormatSettings,
  type CreateTournamentInput,
} from "@/lib/validations/tournament-wizard";
import type { TournamentStatus } from "@/lib/types/database";
import type { RoleActionState } from "@/lib/validations/roles";

// Full wizard-parity update (Basic Info / Game Info / Registration / Advanced
// Options) — allowed any time before the tournament is completed/cancelled.
// The Settings form disables a narrower set of fields client-side once the
// group stage has actually started (slug, the single/two-stage toggle,
// group format, the three schedule dates, group tie breaks — all
// load-bearing for match state that already exists), and this re-checks
// that same lock server-side since the client state can't be trusted.
export async function updateTournamentDetails(
  tournamentId: string,
  currentSlug: string,
  input: CreateTournamentInput
): Promise<RoleActionState & { slug?: string }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const parsed = createTournamentSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors, message: "Check the highlighted fields." };
  }
  const data = parsed.data;
  const staff = await isCurrentUserStaff();

  const supabase = await createClient();
  let existingQuery = supabase
    .from("tournaments")
    .select("status, slug, format_settings, registration_starts_at, registration_deadline, starts_at")
    .eq("id", tournamentId);
  if (!staff) existingQuery = existingQuery.eq("organizer_id", user.id);

  const [{ data: existing }, { count: matchCount }] = await Promise.all([
    existingQuery.maybeSingle(),
    supabase.from("matches").select("id", { count: "exact", head: true }).eq("tournament_id", tournamentId),
  ]);

  if (!existing) return { status: "error", message: "Tournament not found." };
  if (!isTournamentEditable(existing.status)) {
    return { status: "error", message: "This tournament has already started and can no longer be edited." };
  }

  const groupStageStarted = (matchCount ?? 0) > 0;
  if (groupStageStarted) {
    const settings = existing.format_settings;
    const lockedFieldChanged =
      data.slug !== existing.slug ||
      data.stageType !== settings?.stageType ||
      data.groupStage.format !== settings?.groupStage?.format ||
      manilaLocalToUtcIso(data.registrationStartLocal) !== existing.registration_starts_at ||
      manilaLocalToUtcIso(data.registrationDeadlineLocal) !== existing.registration_deadline ||
      manilaLocalToUtcIso(data.startsAtLocal) !== existing.starts_at ||
      data.groupTieBreaks.tieBreak1 !== settings?.groupTieBreaks?.tieBreak1 ||
      data.groupTieBreaks.tieBreak2 !== settings?.groupTieBreaks?.tieBreak2 ||
      data.groupTieBreaks.tieBreak3 !== settings?.groupTieBreaks?.tieBreak3;
    if (lockedFieldChanged) {
      return { status: "error", message: "Some fields are locked because the group stage has already started." };
    }
  }

  let updateQuery = supabase
    .from("tournaments")
    .update({
      community_id: data.hostCommunityId,
      title: data.title,
      slug: data.slug,
      short_description: data.shortDescription,
      description: data.description,
      battle_type: data.battleType,
      tournament_type: data.tournamentType,
      location_name: data.locationName.trim() || null,
      address_line: data.addressLine.trim() || null,
      city: data.city.trim() || null,
      province: data.province.trim() || null,
      latitude: data.latitude,
      longitude: data.longitude,
      prize_snake_drafted: data.prizePool.snakeDrafted,
      prize_same_tier_prizes: data.prizePool.sameTierPrizes,
      prize_uses_ranges: data.prizePool.useParticipantRanges,
      prize_range_sections: data.prizePool.rangeSections,
      bracket_format: resolveBracketFormat(data),
      format_settings: toFormatSettings(data),
      entry_fee: data.registrationFeeType === "paid" ? data.entryFee : 0,
      requires_preregistration_payment: data.registrationFeeType === "paid" && data.requiresPreregistrationPayment,
      preregistration_amount: data.requiresPreregistrationPayment ? data.preregistrationAmount : null,
      preregistration_instructions: data.requiresPreregistrationPayment ? data.preregistrationInstructions.trim() || null : null,
      registration_starts_at: manilaLocalToUtcIso(data.registrationStartLocal),
      registration_deadline: manilaLocalToUtcIso(data.registrationDeadlineLocal),
      starts_at: manilaLocalToUtcIso(data.startsAtLocal),
    })
    .eq("id", tournamentId);
  if (!staff) updateQuery = updateQuery.eq("organizer_id", user.id);

  const { data: updated, error } = await updateQuery.select("slug").single();

  if (error) {
    if (error.code === "23505") {
      return { status: "error", message: "That URL slug is already taken — try another." };
    }
    return { status: "error", message: error.message };
  }

  // Simplest correct way to sync an ordered list with no stable server-side
  // ids on the client: replace the set wholesale rather than diffing.
  const { error: deletePrizesError } = await supabase.from("tournament_prizes").delete().eq("tournament_id", tournamentId);
  let prizesWarning: string | null = deletePrizesError ? "Saved, but the prize pool didn't update." : null;

  if (!deletePrizesError && data.prizePool.prizes.length > 0) {
    const { error: insertPrizesError } = await supabase.from("tournament_prizes").insert(
      data.prizePool.prizes.map((prize, i) => ({
        tournament_id: tournamentId,
        placement: prize.placement,
        prize_name: prize.prizeName,
        sort_order: i,
      }))
    );
    if (insertPrizesError) prizesWarning = "Saved, but the prize pool didn't update.";
  }

  revalidatePath(`/account/organizer/tournament/${currentSlug}`, "layout");
  revalidatePath("/account/organizer/tournament");
  return { status: "success", message: prizesWarning ?? "Saved.", slug: updated.slug };
}

// Permanently deletes the tournament and everything under it (participants,
// groups, prizes, matches all cascade via their FKs). No status gate — an
// organizer can delete a mistaken tournament at any stage; RLS
// (tournaments_delete_organizer_or_admin) is what actually enforces that
// only the organizer or an admin can do it.
export async function deleteTournament(tournamentId: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };
  const staff = await isCurrentUserStaff();

  const supabase = await createClient();
  let query = supabase.from("tournaments").delete().eq("id", tournamentId);
  if (!staff) query = query.eq("organizer_id", user.id);
  const { error } = await query;

  if (error) return { status: "error", message: error.message };

  revalidatePath("/account/organizer/tournament");
  return { status: "success" };
}

// Status transitions (and archive, in dashboard/actions.ts) stay editable
// regardless of whether the tournament has started — this is how an
// organizer marks a tournament ongoing/completed/cancelled in the first place.
export async function updateTournamentStatus(
  tournamentId: string,
  slug: string,
  status: TournamentStatus
): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };
  const staff = await isCurrentUserStaff();

  const supabase = await createClient();
  let query = supabase.from("tournaments").update({ status }).eq("id", tournamentId);
  if (!staff) query = query.eq("organizer_id", user.id);
  const { error } = await query;

  if (error) return { status: "error", message: error.message };

  revalidatePath(`/account/organizer/tournament/${slug}`, "layout");
  revalidatePath("/account/organizer/tournament");
  revalidatePath(`/backend/tournaments/${slug}`, "layout");
  revalidatePath("/backend/tournaments");
  return { status: "success", message: "Status updated." };
}

// Just the Swiss round count, from the Group Stage page's own compact form
// — merges into the existing format_settings.groupStage rather than routing
// through the full Settings form.
export async function updateSwissRounds(tournamentId: string, slug: string, swissRounds: number): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };
  if (!Number.isInteger(swissRounds) || swissRounds < 1 || swissRounds > 20) {
    return { status: "error", message: "Enter a number of rounds between 1 and 20." };
  }
  const staff = await isCurrentUserStaff();

  const supabase = await createClient();
  let fetchQuery = supabase.from("tournaments").select("format_settings").eq("id", tournamentId);
  if (!staff) fetchQuery = fetchQuery.eq("organizer_id", user.id);
  const { data: existing, error: fetchError } = await fetchQuery.maybeSingle();

  if (fetchError) return { status: "error", message: fetchError.message };
  if (!existing) return { status: "error", message: "Tournament not found." };

  let updateQuery = supabase
    .from("tournaments")
    .update({
      format_settings: {
        ...existing.format_settings,
        groupStage: { ...existing.format_settings.groupStage, swissRounds },
      },
    })
    .eq("id", tournamentId);
  if (!staff) updateQuery = updateQuery.eq("organizer_id", user.id);
  const { error } = await updateQuery;

  if (error) return { status: "error", message: error.message };

  revalidatePath(`/account/organizer/tournament/${slug}`, "layout");
  return { status: "success", message: "Saved." };
}
