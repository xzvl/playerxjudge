"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import type { Tournament } from "@/lib/types/database";

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

// Toggles a tournament between "draft" (hidden from the public site) and
// "published" (live). Only ever flips between those two — the `.eq("status",
// ...)` guard means a stale "Publish" button double-clicked after the
// tournament has moved on to registration/ongoing/etc. is a no-op rather
// than silently bumping it back to draft.
export async function setTournamentPublished(tournamentId: string, publish: boolean) {
  const user = await getCurrentUser();
  if (!user) return;

  const supabase = await createClient();
  await supabase
    .from("tournaments")
    .update({ status: publish ? "published" : "draft" })
    .eq("id", tournamentId)
    .eq("organizer_id", user.id)
    .eq("status", publish ? "draft" : "published");

  revalidatePath("/account/organizer/tournament");
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

// Clones a tournament's setup — format, rules, prize pool, location, fees,
// thumbnails — into a brand-new draft the organizer can adjust and publish,
// instead of redoing the whole wizard for a recurring/similar event.
// Deliberately leaves out anything tied to *this run* of the tournament:
// registrations/matches (never touched — only the `tournaments` row and its
// `tournament_prizes` are copied), status/archive state, stats, and the
// champion. Dates are copied as-is; the organizer edits them from Settings.
export async function duplicateTournament(
  tournamentId: string
): Promise<{ status: "success"; slug: string } | { status: "error"; message: string }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { data: source, error: fetchError } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .eq("organizer_id", user.id)
    .maybeSingle();
  if (fetchError || !source) return { status: "error", message: "Tournament not found." };

  const t = source as Tournament;

  // "<slug>-copy", then "-copy-2", "-copy-3", ... until one's free.
  let slug = `${t.slug}-copy`;
  for (let suffix = 2; ; suffix++) {
    const { data: taken } = await supabase.from("tournaments").select("id").eq("slug", slug).maybeSingle();
    if (!taken) break;
    slug = `${t.slug}-copy-${suffix}`;
  }

  // Explicit field list rather than spreading `t` — keeps this to exactly
  // the tournament's "setup" (format/rules/prizes/location/fees) and leaves
  // out anything identity- or run-specific (id, status, stats, champion,
  // timestamps) by construction instead of by remembering to strip it.
  const { data: inserted, error: insertError } = await supabase
    .from("tournaments")
    .insert({
      organizer_id: user.id,
      community_id: t.community_id,
      category_id: t.category_id,
      type_id: t.type_id,
      title: `${t.title} (Copy)`,
      slug,
      short_description: t.short_description,
      description: t.description,
      rules: t.rules,
      thumbnail_url: t.thumbnail_url,
      banner_url: t.banner_url,
      battle_type: t.battle_type,
      tournament_type: t.tournament_type,
      status: "draft",
      bracket_format: t.bracket_format,
      format_settings: t.format_settings,
      is_archived: false,
      starts_at: t.starts_at,
      ends_at: t.ends_at,
      registration_starts_at: t.registration_starts_at,
      registration_deadline: t.registration_deadline,
      location_name: t.location_name,
      address_line: t.address_line,
      city: t.city,
      province_id: t.province_id,
      province: t.province,
      latitude: t.latitude,
      longitude: t.longitude,
      max_participants: t.max_participants,
      entry_fee: t.entry_fee,
      prize_pool: t.prize_pool,
      prize_snake_drafted: t.prize_snake_drafted,
      prize_same_tier_prizes: t.prize_same_tier_prizes,
      prize_uses_ranges: t.prize_uses_ranges,
      prize_range_sections: t.prize_range_sections,
      champion_name: null,
      champion_registration_id: null,
      view_count: 0,
      requires_preregistration_payment: t.requires_preregistration_payment,
      preregistration_amount: t.preregistration_amount,
      preregistration_instructions: t.preregistration_instructions,
      preregistration_qr_url: t.preregistration_qr_url,
    })
    .select("id, slug")
    .single();
  if (insertError) return { status: "error", message: insertError.message };

  const { data: prizes } = await supabase
    .from("tournament_prizes")
    .select("placement, prize_name, sort_order")
    .eq("tournament_id", tournamentId);
  if (prizes && prizes.length > 0) {
    await supabase
      .from("tournament_prizes")
      .insert(prizes.map((p) => ({ tournament_id: inserted.id, ...p })));
  }

  revalidatePath("/account/organizer/tournament");
  return { status: "success", slug: inserted.slug };
}
