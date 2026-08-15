// Real counts for the homepage Hero's stat row (Players / Judges /
// Communities — Tournaments has its own getPublicTournamentCount in
// lib/tournaments/public-listings.ts). All three tables/policies are
// already publicly selectable, so these work for anonymous visitors too:
//   - tournament_participants_select_all — every participant row across
//     every tournament (not deduped by person, not scoped to public-only
//     tournaments — same "no participants until real matches exist" gap
//     PlayerCurrentStats etc. already live with for non-two-stage-Swiss
//     tournaments, see player-view-stats.ts)
//   - profile_roles_select_approved_judges (role='judge' AND
//     status='approved' rows only — 20250101000025_judge_directory_visibility.sql)
//   - communities_select_all, filtered to approval_status='approved' (same
//     gate the public /communities listing uses)
import { createClient } from "@/lib/supabase/server";

export interface PlatformStats {
  players: number;
  judges: number;
  communities: number;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const supabase = await createClient();
  const [{ count: players }, { count: judges }, { count: communities }] = await Promise.all([
    supabase.from("tournament_participants").select("id", { count: "exact", head: true }),
    supabase.from("profile_roles").select("id", { count: "exact", head: true }).eq("role", "judge").eq("status", "approved"),
    supabase.from("communities").select("id", { count: "exact", head: true }).eq("approval_status", "approved"),
  ]);

  return {
    players: players ?? 0,
    judges: judges ?? 0,
    communities: communities ?? 0,
  };
}
