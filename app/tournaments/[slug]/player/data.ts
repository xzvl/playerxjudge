import { cache } from "react";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Bracket, Match, Tournament, TournamentGroup, TournamentParticipant } from "@/lib/types/database";

// Public counterpart to app/account/organizer/tournament/[slug]/data.ts —
// no organizer-ownership check (this is the spectator/player-facing view),
// just the same "not draft/cancelled" gate the rest of the public tournament
// pages use. tournament_groups/tournament_participants/matches are all
// publicly selectable (see the RLS policies in supabase/migrations), so a
// single set of queries covers everyone who lands on this page.
const PUBLIC_STATUS_EXCLUDES = ["draft", "cancelled"] as const;

export interface PlayerViewTournament extends Tournament {
  organizerName: string;
  communityName: string | null;
}

export interface PlayerViewData {
  tournament: PlayerViewTournament;
  groups: TournamentGroup[];
  participants: TournamentParticipant[];
  matches: Match[];
  brackets: Bracket[];
}

export const getPlayerViewData = cache(async (slug: string): Promise<PlayerViewData> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tournaments")
    .select("*, profiles(display_name), communities(name)")
    .eq("slug", slug)
    .not("status", "in", `(${PUBLIC_STATUS_EXCLUDES.join(",")})`)
    .maybeSingle();

  if (!data) notFound();
  const row = data as unknown as Tournament & {
    profiles: { display_name: string } | null;
    communities: { name: string } | null;
  };

  const [{ data: groups }, { data: participants }, { data: matches }, { data: brackets }] = await Promise.all([
    supabase.from("tournament_groups").select("*").eq("tournament_id", row.id).order("sort_order"),
    supabase.from("tournament_participants").select("*").eq("tournament_id", row.id).order("seed"),
    supabase.from("matches").select("*").eq("tournament_id", row.id).order("round").order("match_number"),
    supabase.from("brackets").select("*").eq("tournament_id", row.id),
  ]);

  return {
    tournament: { ...row, organizerName: row.profiles?.display_name ?? "Organizer", communityName: row.communities?.name ?? null },
    groups: (groups as TournamentGroup[] | null) ?? [],
    participants: (participants as TournamentParticipant[] | null) ?? [],
    matches: (matches as Match[] | null) ?? [],
    brackets: (brackets as Bracket[] | null) ?? [],
  };
});
