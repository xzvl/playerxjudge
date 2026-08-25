import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SpectatorBoard } from "@/components/dashboard/organizer/SpectatorBoard";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import { getManagedTournament } from "@/app/account/organizer/tournament/[slug]/data";
import { getJudgeParticipantIds } from "@/lib/tournaments/judge-participant-highlight";
import { computeGroupStandings } from "@/lib/swiss";
import { placeholderSlots, qualifiedSlots } from "@/lib/final-stage-placeholder";
import type { WorkspaceParticipant } from "@/lib/mock/tournament-workspace";
import type { Bracket, Judge, Match, TournamentGroup, TournamentParticipant, TournamentStation } from "@/lib/types/database";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Spectator Mode — ${slug}`, robots: { index: false, follow: false } };
}

export default async function TournamentSpectatorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectTo=/account/organizer/tournament/${slug}/spectator`);

  const tournament = await getManagedTournament(user.id, slug);

  const supabase = await createClient();
  const [{ data: matches }, { data: groups }, { data: participants }, { data: stations }, { data: judgeRows }, { data: brackets }, highlightParticipantIds] =
    await Promise.all([
      supabase.from("matches").select("*").eq("tournament_id", tournament.id).order("round").order("match_number"),
      supabase.from("tournament_groups").select("*").eq("tournament_id", tournament.id).order("sort_order"),
      // "*" (not just id/name/team_name) — seed/group_id are needed below
      // to recompute group standings/final-stage seeding the same way
      // final-stage/page.tsx does, for the Final Result board once the
      // tournament's completed.
      supabase.from("tournament_participants").select("*").eq("tournament_id", tournament.id).order("seed"),
      supabase.from("tournament_stations").select("*").eq("tournament_id", tournament.id).order("sort_order"),
      // A judge claims a station via judges.station_id (see the Stations
      // page) — joined here just to build a static judge_id -> display name
      // map; the live station_id assignment itself comes from the client's
      // own realtime subscription (a judge's display name essentially never
      // changes mid-tournament, so this snapshot doesn't need to be live).
      supabase.from("judges").select("*, profiles(display_name)").eq("tournament_id", tournament.id),
      // Placement brackets ("3rd Place Match", ...) — see
      // finalStageRoundLabels/SpectatorBoard's own bracket-name cards.
      supabase.from("brackets").select("*").eq("tournament_id", tournament.id),
      // Participants who are also an approved judge on this tournament —
      // same highlight every other workspace/player view already gives a
      // player/judge dual role (see getJudgeParticipantIds).
      getJudgeParticipantIds(supabase, tournament.id),
    ]);

  // matches.participant_a_id/participant_b_id point at tournament_participants
  // (a free-typed roster, not `profiles`), so names need a separate lookup —
  // same pattern as the judge Match History page and the player view. Passed
  // down as a plain object (not a Map) since only plain, serializable values
  // cross the server/client component boundary as props.
  const realParticipants = (participants as TournamentParticipant[] | null) ?? [];
  const participantNames: Record<string, string> = {};
  for (const p of realParticipants) {
    participantNames[p.id] = p.team_name ?? p.name;
  }

  // The same final-stage seed list final-stage/page.tsx computes — needed so
  // the Spectator Board can show the exact same "Final Result" tiers
  // /tournaments/[slug]/player does once the tournament wraps (see
  // SpectatorBoard's own computeFinalStandings call). Only meaningful for a
  // real two-stage Swiss tournament, same restriction the player view's
  // Final Result tab already has — other formats don't have a real
  // group-standings pipeline to seed from yet, so this is just `[]` there
  // and SpectatorBoard falls back to championName alone.
  const settings = tournament.format_settings;
  const isRealSwiss = settings?.stageType === "two_stage" && settings.groupStage.format === "swiss";
  const realGroups = (groups as TournamentGroup[] | null) ?? [];
  const realMatches = (matches as Match[] | null) ?? [];
  let finalSlots: WorkspaceParticipant[] = [];
  if (isRealSwiss) {
    const advancePerGroup = settings.groupStage.participantsAdvancePerGroup;
    finalSlots = settings.groupStageEnded
      ? qualifiedSlots(
          realGroups,
          new Map(
            realGroups.map((g) => {
              const members = realParticipants.filter((p) => p.group_id === g.id);
              const groupMatches = realMatches.filter((m) => m.group_id === g.id);
              const rows = computeGroupStandings(members, groupMatches, settings.groupStage.swissPoints, [
                settings.groupTieBreaks.tieBreak1,
                settings.groupTieBreaks.tieBreak2,
                settings.groupTieBreaks.tieBreak3,
              ]);
              return [g.id, rows.map((r) => ({ participantId: r.participantId, name: r.name, teamName: r.teamName }))] as const;
            })
          ),
          advancePerGroup
        )
      : placeholderSlots(realGroups, advancePerGroup);
  }

  type JudgeRowWithProfile = Judge & { profiles: { display_name: string } | null };
  const judgeRowsTyped = (judgeRows as JudgeRowWithProfile[] | null) ?? [];
  const judgeNameByJudgeId: Record<string, string> = {};
  const initialJudges: Judge[] = judgeRowsTyped.map((j) => {
    judgeNameByJudgeId[j.judge_id] = j.profiles?.display_name ?? "Unknown Judge";
    return {
      id: j.id,
      tournament_id: j.tournament_id,
      judge_id: j.judge_id,
      role_note: j.role_note,
      assigned_at: j.assigned_at,
      status: j.status,
      decided_at: j.decided_at,
      station_id: j.station_id,
    };
  });

  return (
    <SpectatorBoard
      tournamentId={tournament.id}
      tournamentTitle={tournament.title}
      initialMatches={realMatches}
      groups={realGroups}
      participantNames={participantNames}
      initialStations={(stations as TournamentStation[] | null) ?? []}
      initialJudges={initialJudges}
      initialBrackets={(brackets as Bracket[] | null) ?? []}
      judgeNameByJudgeId={judgeNameByJudgeId}
      judgePlayerParticipantIds={[...highlightParticipantIds]}
      finalSlots={finalSlots}
      tournamentEnded={tournament.status === "completed"}
      championName={tournament.champion_name}
    />
  );
}
