"use client";

import { useState } from "react";
import { ChevronDown, Flag, ListOrdered, Medal, Trophy, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import type { FinalStandingRow } from "@/lib/final-stage-placeholder";
import { cn } from "@/lib/utils";

type ResultCardKind = "champion" | "runnerUp" | "finalist";

interface ResultTier {
  kind: ResultCardKind;
  rows: FinalStandingRow[];
  // One label per row — "Champion"/ordinal Runner-up tiers label each row
  // individually; a "Top N Finalist" tier repeats the same label for every
  // row in it (see buildResultTiers).
  labels: string[];
}

const RUNNER_UP_ORDINALS = ["1st Runner-up", "2nd Runner-up", "3rd Runner-up"];

// Chunks computeFinalStandings' best-to-worst rows into the tiers a real
// single-elimination bracket naturally produces: the champion (1), the
// grand-final loser (1), the semifinal losers (2), the quarterfinal losers
// (4), the round-of-16 losers (8), and so on — each round eliminates twice
// as many people as the round after it, so tier sizes double every step,
// same doubling `computeFinalStandings`' own eliminatedRound-descending sort
// already groups by. Only the first four spots get individual ordinal
// labels (Champion, 1st/2nd/3rd Runner-up); everyone eliminated in the same
// round afterward shares one "Top N Finalist" label instead — a real
// bracket doesn't rank round-of-16 losers against each other either.
function buildResultTiers(rows: FinalStandingRow[]): ResultTier[] {
  const tiers: ResultTier[] = [];
  if (rows.length === 0) return tiers;

  tiers.push({ kind: "champion", rows: [rows[0]], labels: ["Champion"] });

  const runnerUps = rows.slice(1, 4);
  if (runnerUps.length > 0) {
    tiers.push({ kind: "runnerUp", rows: runnerUps, labels: RUNNER_UP_ORDINALS.slice(0, runnerUps.length) });
  }

  let i = 4;
  let groupSize = 4;
  while (i < rows.length) {
    const group = rows.slice(i, i + groupSize);
    i += group.length;
    const label = `Top ${i} Finalist`;
    tiers.push({ kind: "finalist", rows: group, labels: group.map(() => label) });
    groupSize *= 2;
  }
  return tiers;
}

// 1st Runner-up (the grand-final loser) gets the silver medal; 2nd/3rd
// Runner-up (the tied semifinal losers) share bronze — same silver/bronze
// split a real podium uses for an outright 2nd place vs. a tied 3rd.
const RUNNER_UP_MEDAL_COLOR = ["#94a3b8", "#b45309", "#b45309"];

function ResultCard({
  label,
  name,
  kind,
  medalColor,
}: {
  label: string;
  name: string;
  kind: ResultCardKind;
  medalColor?: string;
}) {
  if (kind === "champion") {
    return (
      <div className="mx-auto flex w-full max-w-xs flex-col items-center gap-2 border border-primary/40 bg-primary/5 p-6 text-center">
        <Trophy className="h-9 w-9 shrink-0 text-[#eab308]" aria-hidden="true" />
        <p className="label-mono text-[#eab308]">{label}</p>
        <p className="heading text-xl text-on-surface">{name}</p>
      </div>
    );
  }
  if (kind === "runnerUp") {
    const color = medalColor ?? "#94a3b8";
    return (
      <div className="flex flex-col items-center gap-2 border border-outline-variant/25 bg-surface-container-low p-5 text-center">
        <Medal className="h-6 w-6 shrink-0" style={{ color }} aria-hidden="true" />
        <p className="label-mono" style={{ color }}>{label}</p>
        <p className="heading text-base text-on-surface">{name}</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1.5 border border-outline-variant/20 bg-surface-container-low p-4 text-center">
      <Users className="h-4 w-4 shrink-0 text-on-surface/30" aria-hidden="true" />
      <p className="label-mono text-[10px] text-on-surface/40">{label}</p>
      <p className="text-sm font-bold text-on-surface">{name}</p>
    </div>
  );
}

// The tournament's definitive result, tiered like a real bracket: Champion
// and Runner-up placements always visible, everyone else revealed a tier
// ("Top 8 Finalist", "Top 16 Finalist", ...) at a time behind "Show more"
// rather than dumping a long list at once. `rows` is computeFinalStandings'
// output (best-to-worst) — same data Standing's final-stage table renders,
// just grouped and dressed up here. `championName`
// (tournaments.champion_name, snapshotted once by endTournament in
// matches-actions.ts) is preferred over rows[0] for the Champion card since
// it's the actual source of truth the rest of the app reads the champion
// from.
function FinalResultBoard({ rows, championName }: { rows: FinalStandingRow[]; championName: string | null }) {
  // Champion + Runner-up tiers (buildResultTiers' first two entries, when
  // present) are always shown — everything past that starts hidden.
  const [revealedTiers, setRevealedTiers] = useState(2);

  if (rows.length === 0) {
    if (!championName) {
      return (
        <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
          Results are being finalized.
        </p>
      );
    }
    return (
      <div className="grid grid-cols-1">
        <ResultCard label="Champion" name={championName} kind="champion" />
      </div>
    );
  }

  const tiers = buildResultTiers(rows);
  const visibleTiers = tiers.slice(0, revealedTiers);
  const hasMore = revealedTiers < tiers.length;

  return (
    <div className="space-y-6">
      {visibleTiers.map((tier, tierIndex) => (
        <div
          key={tierIndex}
          className={cn(
            "grid gap-4",
            tier.kind === "champion" && "grid-cols-1",
            tier.kind === "runnerUp" && "grid-cols-1 sm:grid-cols-3",
            tier.kind === "finalist" && "grid-cols-2 sm:grid-cols-4"
          )}
        >
          {tier.rows.map((row, i) => (
            <ResultCard
              key={row.participantId}
              label={tier.labels[i]}
              name={tier.kind === "champion" ? (championName ?? row.teamName ?? row.name) : (row.teamName ?? row.name)}
              kind={tier.kind}
              medalColor={tier.kind === "runnerUp" ? RUNNER_UP_MEDAL_COLOR[i] : undefined}
            />
          ))}
        </div>
      ))}

      {hasMore ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            tooltip="Show the next elimination tier"
            onClick={() => setRevealedTiers((n) => n + 1)}
          >
            <ChevronDown className="h-3.5 w-3.5" /> Show more
          </Button>
        </div>
      ) : null}
    </div>
  );
}

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
  groupStageEnded,
  finalStageStarted,
  finalBaseRounds,
  finalSlots,
  brackets,
  placementSections,
  finalParticipantsById,
  selectedParticipantId,
  highlightParticipantIds,
  tournamentEnded,
  championName,
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
  // Whether the group stage has locked (Standings becomes the default tab
  // once true, ahead of the final stage actually starting).
  groupStageEnded: boolean;
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
  // tournaments.status === "completed" — gates the Final Result tab
  // (there's nothing definitive to show before then) and makes it the
  // default tab once true.
  tournamentEnded: boolean;
  // tournaments.champion_name, snapshotted once by endTournament
  // (matches-actions.ts) — preferred display name for the #1 podium slot.
  championName: string | null;
}) {
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  useRealtimeMatches(tournamentId, setMatches);

  const groupMatches = matches.filter((m) => m.group_id !== null);
  const finalMatches = matches.filter((m) => m.group_id === null);
  const finalRows = finalStageStarted ? computeFinalStandings(finalSlots, finalMatches) : [];

  // Whichever tab reflects "what's happening right now" wins, latest stage
  // first: a completed tournament always opens on its result, an in-progress
  // final stage always opens on the bracket, and so on down to the plain
  // default of Group Stage. Falls back sensibly for the (currently unused
  // here) hasGroupStage=false case too.
  const defaultTab = tournamentEnded
    ? "final-result"
    : finalStageStarted
      ? "final"
      : hasGroupStage && groupStageEnded
        ? "standing"
        : hasGroupStage
          ? "group"
          : "final";

  return (
    <section id="tournament" className="scroll-mt-20">
      <h2 className="label-mono mb-3 flex items-center gap-2 text-primary">
        <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> Tournament Stages and Standing
      </h2>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          {tournamentEnded ? (
            <TabsTrigger value="final-result" className="gap-1.5">
              <Trophy className="h-3.5 w-3.5" /> Final Result
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="final" className="gap-1.5">
            <Trophy className="h-3.5 w-3.5" /> Final Stage
          </TabsTrigger>
          {hasGroupStage ? (
            <TabsTrigger value="group" className="gap-1.5">
              <Flag className="h-3.5 w-3.5" /> Group Stage
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="standing" className="gap-1.5">
            <ListOrdered className="h-3.5 w-3.5" /> Standing
          </TabsTrigger>
        </TabsList>

        {tournamentEnded ? (
          <TabsContent value="final-result">
            <FinalResultBoard rows={finalRows} championName={championName} />
          </TabsContent>
        ) : null}

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
