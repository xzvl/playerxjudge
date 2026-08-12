import type { Metadata } from "next";

import { PlayerViewShell } from "@/components/tournaments/player/PlayerViewShell";
import { PlayerCurrentStats } from "@/components/tournaments/player/PlayerCurrentStats";
import { PlayerStagesSection } from "@/components/tournaments/player/PlayerStagesSection";
import { PlayerMatchesSection } from "@/components/tournaments/player/PlayerMatchesSection";
import { PlayerStatsSidebar } from "@/components/tournaments/player/PlayerStatsSidebar";
import { PlayerPreviewView } from "@/components/tournaments/player/PlayerPreviewView";
import { getPlayerViewData } from "@/app/tournaments/[slug]/player/data";
import { getTournamentWorkspace } from "@/lib/mock/tournament-workspace";
import { computeGroupStandings, type StandingsRow } from "@/lib/swiss";
import {
  buildPlacementSections,
  buildSeededBracket,
  computeFinalStandings,
  placeholderSlots,
  qualifiedSlots,
} from "@/lib/final-stage-placeholder";
import { computeFinishCounts, participantMatches } from "@/lib/player-view-stats";
import { TIE_BREAK_OPTIONS } from "@/lib/validations/tournament-wizard";
import { getCurrentUser, getCurrentUserRoles } from "@/lib/supabase/get-user";
import type { NavUser } from "@/components/layout/ProfileMenu";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { tournament } = await getPlayerViewData(slug);
  return { title: `Player — ${tournament.title}` };
}

const STATUS_LABEL: Record<string, string> = {
  ongoing: "Ongoing",
  completed: "Completed",
};

export default async function TournamentPlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ p?: string }>;
}) {
  const { slug } = await params;
  const { p: requestedParticipantId } = await searchParams;
  const { tournament, groups, participants, matches, brackets } = await getPlayerViewData(slug);

  const authUser = await getCurrentUser();
  const roles = authUser ? await getCurrentUserRoles() : [];
  const user: NavUser | null = authUser
    ? {
        email: authUser.email ?? null,
        displayName:
          (authUser.user_metadata?.display_name as string | undefined) ??
          authUser.email?.split("@")[0] ??
          "Player",
        avatarUrl: (authUser.user_metadata?.avatar_url as string | undefined) ?? null,
        isOrganizer: roles.some((r) => r.role === "organizer" && r.status === "approved"),
      }
    : null;

  const organizedBy = tournament.communityName ?? tournament.organizerName;
  const statusLabel = STATUS_LABEL[tournament.status] ?? "Not Yet Started";
  const isOngoing = tournament.status === "ongoing";

  const settings = tournament.format_settings;
  const isRealSwiss = settings?.stageType === "two_stage" && settings.groupStage.format === "swiss";

  // Everything other than a two-stage Swiss tournament (including the
  // default single-stage setup new tournaments start with) has no real
  // match-generation pipeline behind it yet — see PlayerPreviewView's doc
  // comment. Fall back to the same deterministic mock-derived preview the
  // organizer's own workspace pages use rather than fabricate stats.
  if (!isRealSwiss) {
    const workspace = getTournamentWorkspace(tournament);
    const selectedId =
      requestedParticipantId && workspace.participants.some((p) => p.id === requestedParticipantId)
        ? requestedParticipantId
        : (workspace.participants[0]?.id ?? null);

    return (
      <PlayerViewShell tournamentTitle={tournament.title} organizedBy={organizedBy} user={user}>
        <PlayerPreviewView workspace={workspace} selectedId={selectedId} />
      </PlayerViewShell>
    );
  }

  const tieBreakMetrics: [typeof TIE_BREAK_OPTIONS[number]["value"], typeof TIE_BREAK_OPTIONS[number]["value"], typeof TIE_BREAK_OPTIONS[number]["value"]] = [
    settings.groupTieBreaks.tieBreak1,
    settings.groupTieBreaks.tieBreak2,
    settings.groupTieBreaks.tieBreak3,
  ];
  const advancePerGroup = settings.groupStage.participantsAdvancePerGroup;
  const swissRoundsCap = settings.groupStage.swissRounds ?? 5;
  const groupStageEnded = settings.groupStageEnded === true;
  const finalStageStarted = settings.finalStageStarted === true;

  const standingsByGroupId = new Map(
    groups.map((g) => {
      const members = participants.filter((p) => p.group_id === g.id);
      const groupMatches = matches.filter((m) => m.group_id === g.id);
      const rows = computeGroupStandings(members, groupMatches, settings.groupStage.swissPoints, tieBreakMetrics);
      return [g.id, rows] as const;
    })
  );
  const standingsByParticipantId = new Map<string, StandingsRow>();
  const groupRankByParticipantId = new Map<string, number>();
  for (const rows of standingsByGroupId.values()) {
    rows.forEach((row, i) => {
      standingsByParticipantId.set(row.participantId, row);
      groupRankByParticipantId.set(row.participantId, i + 1);
    });
  }

  const slots = groupStageEnded
    ? qualifiedSlots(
        groups,
        new Map([...standingsByGroupId].map(([groupId, rows]) => [groupId, rows.map((r) => ({ participantId: r.participantId, name: r.name, teamName: r.teamName }))])),
        advancePerGroup
      )
    : placeholderSlots(groups, advancePerGroup);
  const finalMatches = matches.filter((m) => m.group_id === null);
  const finalRows = finalStageStarted ? computeFinalStandings(slots, finalMatches) : [];
  const finalRankByParticipantId = new Map(finalRows.map((r, i) => [r.participantId, i + 1]));
  const bracketRounds = buildSeededBracket(slots);
  const finalParticipantsById = new Map(slots.map((s) => [s.id, { seed: s.seed, name: s.name, teamName: s.teamName }]));
  const placementSections = settings.finalStage.breakTiesWithPlacementMatches
    ? buildPlacementSections(bracketRounds.length, settings.finalStage.breakTiesThroughPlace ?? 0)
    : [];

  const options = participants.map((p) => ({ id: p.id, displayName: p.team_name ?? p.name }));
  const selectedId =
    requestedParticipantId && participants.some((p) => p.id === requestedParticipantId)
      ? requestedParticipantId
      : (participants[0]?.id ?? null);
  const selectedParticipant = selectedId ? participants.find((p) => p.id === selectedId) ?? null : null;
  const groupRow = selectedId ? standingsByParticipantId.get(selectedId) ?? null : null;

  const groupLabelById = new Map(groups.map((g) => [g.id, g.label]));
  function stageLabelFor(match: { group_id: string | null }): string {
    if (match.group_id === null) return "Final";
    return `Group ${groupLabelById.get(match.group_id) ?? "?"}`;
  }

  // Final-stage rounds carry bracket names (Grand Final, Semifinals, ...)
  // instead of a plain round number — `bracketRounds[n].label` already
  // computes those from the bracket's size, and a real final-stage match's
  // `round` (1-indexed) lines up with that array position (see
  // final-stage-placeholder.ts's applyRealMatches doc comment).
  const finalRoundLabelByNumber = new Map(bracketRounds.map((r, i) => [i + 1, r.label]));
  function roundLabelFor(match: { group_id: string | null; round: number }): string {
    if (match.group_id === null) return finalRoundLabelByNumber.get(match.round) ?? `Round ${match.round}`;
    return `Round ${match.round}`;
  }

  const allParticipantsById = new Map(participants.map((p) => [p.id, { seed: p.seed, name: p.name, teamName: p.team_name }]));
  const selectedMatches = selectedId ? participantMatches(selectedId, matches) : [];
  const selectedFinishCounts = selectedId ? computeFinishCounts(selectedId, matches) : { burst: 0, spin: 0, extreme: 0, over: 0 };
  const matchesPlayed = selectedMatches.filter((m) => m.status === "completed").length;

  return (
    <PlayerViewShell tournamentTitle={tournament.title} organizedBy={organizedBy} user={user}>
      <div className="grid items-start gap-8 lg:grid-cols-3">
        <div className="space-y-12 lg:col-span-2">
          <PlayerCurrentStats
            statusLabel={statusLabel}
            isOngoing={isOngoing}
            options={options}
            selectedId={selectedId}
            groupRow={groupRow}
            groupRank={selectedId ? groupRankByParticipantId.get(selectedId) ?? null : null}
            finalRank={selectedId ? finalRankByParticipantId.get(selectedId) ?? null : null}
            showGroupRanking={!!selectedParticipant?.group_id}
            showFinalRanking={finalStageStarted}
            tieBreakMetrics={tieBreakMetrics}
            tieBreakOptions={TIE_BREAK_OPTIONS}
          />

          <PlayerStagesSection
            hasGroupStage
            groups={groups}
            participants={participants}
            groupMatches={matches.filter((m) => m.group_id !== null)}
            swissPoints={settings.groupStage.swissPoints}
            tieBreakMetrics={tieBreakMetrics}
            advanceCount={advancePerGroup}
            swissRoundsCap={swissRoundsCap}
            finalStageStarted={finalStageStarted}
            finalBaseRounds={bracketRounds}
            finalMatches={finalMatches}
            brackets={brackets}
            placementSections={placementSections}
            finalParticipantsById={finalParticipantsById}
            finalRows={finalRows}
            selectedParticipantId={selectedId}
          />

          {selectedId ? (
            <PlayerMatchesSection
              selectedParticipantId={selectedId}
              matches={selectedMatches}
              allMatches={matches}
              stageLabelFor={stageLabelFor}
              roundLabelFor={roundLabelFor}
              participantsById={allParticipantsById}
              standingsByParticipantId={standingsByParticipantId}
            />
          ) : null}
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <PlayerStatsSidebar
            playerName={selectedParticipant ? selectedParticipant.team_name ?? selectedParticipant.name : "?"}
            finishCounts={selectedFinishCounts}
            matchesPlayed={matchesPlayed}
            matchesSeated={selectedMatches.length}
          />
        </div>
      </div>
    </PlayerViewShell>
  );
}
