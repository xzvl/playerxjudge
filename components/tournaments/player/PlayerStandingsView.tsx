import { Flag, Trophy } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GroupStandingsTable } from "@/components/dashboard/organizer/GroupStageWorkspace";
import { FinalStageStandingsTable } from "@/components/dashboard/organizer/FinalStageStandingsTable";
import type { FinalStandingRow } from "@/lib/final-stage-placeholder";
import type { SwissPoints, TieBreakMetric } from "@/lib/validations/tournament-wizard";
import type { Match, TournamentGroup, TournamentParticipant } from "@/lib/types/database";

// Mirrors /account/organizer/tournament/[slug]/standings — same Group
// Stage / Final Stage sub-tabs, same tables (GroupStandingsTable already
// carries the red "ADV" tag once a group's final round is complete).
export function PlayerStandingsView({
  groups,
  participants,
  matches,
  swissPoints,
  tieBreakMetrics,
  advanceCount,
  swissRoundsCap,
  finalStageStarted,
  finalRows,
}: {
  groups: TournamentGroup[];
  participants: TournamentParticipant[];
  matches: Match[];
  swissPoints: SwissPoints;
  tieBreakMetrics: [TieBreakMetric, TieBreakMetric, TieBreakMetric];
  advanceCount: number;
  swissRoundsCap: number;
  finalStageStarted: boolean;
  finalRows: FinalStandingRow[];
}) {
  return (
    <Tabs defaultValue={finalStageStarted ? "final" : "group"}>
      <TabsList>
        <TabsTrigger value="group" className="gap-1.5">
          <Flag className="h-3.5 w-3.5" /> Group Stage
        </TabsTrigger>
        <TabsTrigger value="final" className="gap-1.5">
          <Trophy className="h-3.5 w-3.5" /> Final Stage
        </TabsTrigger>
      </TabsList>

      <TabsContent value="group">
        {groups.length > 0 ? (
          <div className="space-y-8">
            {groups.map((g) => {
              const members = participants.filter((p) => p.group_id === g.id);
              const groupMatches = matches.filter((m) => m.group_id === g.id);
              return (
                <section key={g.id}>
                  <h3 className="label-mono mb-3 text-on-surface/60">Group {g.label}</h3>
                  <GroupStandingsTable
                    participants={members}
                    matches={groupMatches}
                    swissPoints={swissPoints}
                    tieBreakMetrics={tieBreakMetrics}
                    advanceCount={advanceCount}
                    swissRoundsCap={swissRoundsCap}
                  />
                </section>
              );
            })}
          </div>
        ) : (
          <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
            No groups yet.
          </p>
        )}
      </TabsContent>

      <TabsContent value="final">
        {finalStageStarted ? (
          <FinalStageStandingsTable rows={finalRows} />
        ) : (
          <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
            Standings will appear once the final stage starts.
          </p>
        )}
      </TabsContent>
    </Tabs>
  );
}
