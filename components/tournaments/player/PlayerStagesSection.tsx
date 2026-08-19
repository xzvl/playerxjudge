"use client";

import { useState } from "react";
import { Flag, ListOrdered, Trophy } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayerGroupStageView } from "@/components/tournaments/player/PlayerGroupStageView";
import { PlayerFinalStageView } from "@/components/tournaments/player/PlayerFinalStageView";
import { PlayerStandingsView } from "@/components/tournaments/player/PlayerStandingsView";
import { FinalStageStandingsTable } from "@/components/dashboard/organizer/FinalStageStandingsTable";
import type { RosterLite } from "@/components/dashboard/organizer/GroupStageWorkspace";
import { useRealtimeMatches } from "@/lib/hooks/use-realtime-matches";
import { computeFinalStandings, type PlacementSection } from "@/lib/final-stage-placeholder";
import type { WorkspaceBracketRound, WorkspaceParticipant } from "@/lib/mock/tournament-workspace";
import type { SwissPoints, TieBreakMetric } from "@/lib/validations/tournament-wizard";
import type { Bracket, Match, TournamentGroup, TournamentParticipant } from "@/lib/types/database";

// "Tournament" section — mirrors the organizer workspace's Group Stage /
// Final Stage pages plus the Standings page, all in one place and entirely
// read-only (spectator view). A client component (not just for the Tabs)
// because it owns the tournament's live `matches` state — see
// useRealtimeMatches — so a result reported anywhere (judge console,
// organizer, backend) shows up here the moment it's written, not just on
// this tab's own next reload.
export function PlayerStagesSection({
  hasGroupStage,
  groups,
  participants,
  tournamentId,
  initialMatches,
  swissPoints,
  tieBreakMetrics,
  advanceCount,
  swissRoundsCap,
  finalStageStarted,
  finalBaseRounds,
  finalSlots,
  brackets,
  placementSections,
  finalParticipantsById,
  selectedParticipantId,
  highlightParticipantIds,
}: {
  hasGroupStage: boolean;
  groups: TournamentGroup[];
  participants: TournamentParticipant[];
  tournamentId: string;
  // Every match in the tournament (group *and* final stage) — filtered
  // into each half below, same split GroupStageWorkspace/
  // FinalStageBracketWorkspace already do from their own equivalent state.
  initialMatches: Match[];
  swissPoints: SwissPoints;
  tieBreakMetrics: [TieBreakMetric, TieBreakMetric, TieBreakMetric];
  advanceCount: number;
  swissRoundsCap: number;
  finalStageStarted: boolean;
  finalBaseRounds: WorkspaceBracketRound[];
  // The final stage's frozen seed list (qualifiedSlots/placeholderSlots,
  // computed server-side once) — used here to recompute the Final Stage
  // standings table (computeFinalStandings) as `finalMatches` changes live.
  // Doesn't itself need to be live: the group stage locks the moment the
  // final stage starts, so who's seeded into it never changes afterward.
  finalSlots: WorkspaceParticipant[];
  brackets: Bracket[];
  placementSections: PlacementSection[];
  finalParticipantsById: Map<string, RosterLite>;
  // Whichever participant is currently selected up in Current Stats — passed
  // down so the group/final match tables can highlight their own matches.
  selectedParticipantId: string | null;
  // Participants whose linked account is also an approved judge on this
  // tournament (see getJudgeParticipantIds) — their name gets a yellow
  // highlight so a player/judge dual role never reads as an ordinary entry.
  highlightParticipantIds?: Set<string>;
}) {
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  useRealtimeMatches(tournamentId, setMatches);

  const groupMatches = matches.filter((m) => m.group_id !== null);
  const finalMatches = matches.filter((m) => m.group_id === null);
  const finalRows = finalStageStarted ? computeFinalStandings(finalSlots, finalMatches) : [];

  return (
    <section id="tournament" className="scroll-mt-20">
      <h2 className="label-mono mb-3 flex items-center gap-2 text-primary">
        <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> Tournament Stages and Standing
      </h2>

      <Tabs defaultValue={hasGroupStage ? "group" : "final"}>
        <TabsList>
          {hasGroupStage ? (
            <TabsTrigger value="group" className="gap-1.5">
              <Flag className="h-3.5 w-3.5" /> Group Stage
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="final" className="gap-1.5">
            <Trophy className="h-3.5 w-3.5" /> Final Stage
          </TabsTrigger>
          <TabsTrigger value="standing" className="gap-1.5">
            <ListOrdered className="h-3.5 w-3.5" /> Standing
          </TabsTrigger>
        </TabsList>

        {hasGroupStage ? (
          <TabsContent value="group">
            <PlayerGroupStageView
              groups={groups}
              participants={participants}
              matches={groupMatches}
              swissPoints={swissPoints}
              tieBreakMetrics={tieBreakMetrics}
              advanceCount={advanceCount}
              swissRoundsCap={swissRoundsCap}
              selectedParticipantId={selectedParticipantId}
              highlightParticipantIds={highlightParticipantIds}
            />
          </TabsContent>
        ) : null}

        <TabsContent value="final">
          {finalStageStarted ? (
            <PlayerFinalStageView
              baseRounds={finalBaseRounds}
              matches={finalMatches}
              brackets={brackets}
              placementSections={placementSections}
              participantsById={finalParticipantsById}
              selectedParticipantId={selectedParticipantId}
              highlightParticipantIds={highlightParticipantIds}
            />
          ) : (
            <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
              {hasGroupStage
                ? "The bracket will appear once the final stage starts."
                : "The bracket will appear once seeding is complete."}
            </p>
          )}
        </TabsContent>

        <TabsContent value="standing">
          {hasGroupStage ? (
            <PlayerStandingsView
              groups={groups}
              participants={participants}
              matches={groupMatches}
              swissPoints={swissPoints}
              tieBreakMetrics={tieBreakMetrics}
              advanceCount={advanceCount}
              swissRoundsCap={swissRoundsCap}
              finalStageStarted={finalStageStarted}
              finalRows={finalRows}
              highlightParticipantIds={highlightParticipantIds}
            />
          ) : finalStageStarted ? (
            <FinalStageStandingsTable rows={finalRows} highlightParticipantIds={highlightParticipantIds} />
          ) : (
            <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
              Standings will appear once the tournament starts.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}
