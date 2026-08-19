import { createClient } from "@/lib/supabase/server";

// Participant ids whose linked account (see participant_links — an
// approved claim connecting a real profile to a tournament_participants
// roster entry) is *also* an approved judge on this same tournament — i.e.
// someone both playing in and judging the same event. Surfaced as a yellow
// highlight everywhere a participant's name renders: the organizer and
// backend staff's Group Stage / Final Stage workspaces, and the public
// player view's own Stages/Standings tables.
//
// Both `judges` and `participant_links` are publicly selectable already
// (see 20250101000030_judge_station_updates.sql and
// 20250101000036_participant_links.sql), so this needs no elevated client —
// just two scoped reads and a join in memory.
export async function getJudgeParticipantIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: string
): Promise<Set<string>> {
  const [{ data: judgeRows }, { data: linkRows }] = await Promise.all([
    supabase.from("judges").select("judge_id").eq("tournament_id", tournamentId).eq("status", "approved"),
    supabase.from("participant_links").select("participant_id, profile_id").eq("tournament_id", tournamentId).eq("status", "approved"),
  ]);

  const judgeProfileIds = new Set((judgeRows as { judge_id: string }[] | null ?? []).map((j) => j.judge_id));
  const ids = (linkRows as { participant_id: string; profile_id: string }[] | null ?? [])
    .filter((l) => judgeProfileIds.has(l.profile_id))
    .map((l) => l.participant_id);
  return new Set(ids);
}
