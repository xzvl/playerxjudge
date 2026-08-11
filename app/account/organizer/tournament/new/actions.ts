"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { manilaLocalToUtcIso } from "@/lib/format";
import {
  createTournamentSchema,
  resolveBracketFormat,
  toFormatSettings,
  type CreateTournamentInput,
} from "@/lib/validations/tournament-wizard";
import type { RoleActionState } from "@/lib/validations/roles";

export async function createTournament(input: CreateTournamentInput): Promise<RoleActionState & { id?: string; slug?: string }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in to create a tournament." };

  const parsed = createTournamentSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors, message: "Check the highlighted fields." };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("tournaments")
    .insert({
      organizer_id: user.id,
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
      status: "published",
      bracket_format: resolveBracketFormat(data),
      format_settings: toFormatSettings(data),
      entry_fee: data.registrationFeeType === "paid" ? data.entryFee : 0,
      registration_starts_at: manilaLocalToUtcIso(data.registrationStartLocal),
      registration_deadline: manilaLocalToUtcIso(data.registrationDeadlineLocal),
      starts_at: manilaLocalToUtcIso(data.startsAtLocal),
    })
    .select("id, slug")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { status: "error", message: "That URL slug is already taken — try another." };
    }
    return { status: "error", message: error.message };
  }

  if (data.prizePool.prizes.length > 0) {
    await supabase.from("tournament_prizes").insert(
      data.prizePool.prizes.map((prize, i) => ({
        tournament_id: inserted.id,
        placement: prize.placement,
        prize_name: prize.prizeName,
        sort_order: i,
      }))
    );
  }

  return { status: "success", id: inserted.id, slug: inserted.slug };
}
