import { Flag, ListOrdered, Trophy } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayerGroupStageView } from "@/components/tournaments/player/PlayerGroupStageView";
import { PlayerFinalStageView } from "@/components/tournaments/player/PlayerFinalStageView";
import { PlayerStandingsView } from "@/components/tournaments/player/PlayerStandingsView";
import { FinalStageStandingsTable } from "@/components/dashboard/organizer/FinalStageStandingsTable";
import type { RosterLite } from "@/components/dashboard/organizer/GroupStageWorkspace";
import type { PlacementSection, FinalStandingRow } from "@/lib/final-stage-placeholder";
import type { WorkspaceBracketRound } from "@/lib/mock/tournament-workspace";
import type { SwissPoints, TieBreakMetric } from "@/lib/validations/tournament-wizard";
import type { Bracket, Match, TournamentGroup, TournamentParticipant } from "@/lib/types/database";

// "Tournament" section — mirrors the organizer workspace's Group Stage /
// Final Stage pages plus the Standings page, all in one place and entirely
// read-only (spectator view).
export function PlayerStagesSection({
  hasGroupStage,
  groups,
  participants,
  groupMatches,
  swissPoints,
  tieBreakMetrics,
  advanceCount,
  swissRoundsCap,
  finalStageStarted,
  finalBaseRounds,
  finalMatches,
  brackets,
  placementSections,
  finalParticipantsById,
  finalRows,
  selectedParticipantId,
}: {
  hasGroupStage: boolean;
  groups: TournamentGroup[];
  participants: TournamentParticipant[];
  groupMatches: Match[];
  swissPoints: SwissPoints;
  tieBreakMetrics: [TieBreakMetric, TieBreakMetric, TieBreakMetric];
  advanceCount: number;
  swissRoundsCap: number;
  finalStageStarted: boolean;
  finalBaseRounds: WorkspaceBracketRound[];
  finalMatches: Match[];
  brackets: Bracket[];
  placementSections: PlacementSection[];
  finalParticipantsById: Map<string, RosterLite>;
  finalRows: FinalStandingRow[];
  // Whichever participant is currently selected up in Current Stats — passed
  // down so the group/final match tables can highlight their own matches.
  selectedParticipantId: string | null;
}) {
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
            />
          ) : finalStageStarted ? (
            <FinalStageStandingsTable rows={finalRows} />
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
