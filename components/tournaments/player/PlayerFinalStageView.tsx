"use client";

import { useState } from "react";

import { WorkspaceBracket, type BracketActions } from "@/components/dashboard/organizer/WorkspaceBracket";
import { MatchDetailsDialog, type RosterLite } from "@/components/dashboard/organizer/GroupStageWorkspace";
import { advanceWinners, applyRealMatches, populateSectionFromFeeder, type PlacementSection } from "@/lib/final-stage-placeholder";
import type { WorkspaceBracketRound, WorkspaceMatch } from "@/lib/mock/tournament-workspace";
import type { Bracket, Match } from "@/lib/types/database";

// Read-only counterpart to FinalStageBracketWorkspace: same bracket
// rendering (main bracket + any placement sections, winners auto-filled in
// from real match rows) but hover actions are locked to Match Details only —
// no Start/Report/Edit, this is the spectator-facing page.
export function PlayerFinalStageView({
  baseRounds,
  matches,
  brackets,
  placementSections,
  participantsById,
  selectedParticipantId,
}: {
  baseRounds: WorkspaceBracketRound[];
  matches: Match[];
  brackets: Bracket[];
  placementSections: PlacementSection[];
  participantsById: Map<string, RosterLite>;
  selectedParticipantId?: string | null;
}) {
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const matchesById = new Map(matches.map((m) => [m.id, m]));
  const mainBracketMatches = matches.filter((m) => m.bracket_id === null);
  const mainRounds = advanceWinners(applyRealMatches(baseRounds, mainBracketMatches));

  // Same `structure.key` -> bracket id lookup FinalStageBracketWorkspace
  // builds from its own `initialBrackets` state — no state needed here,
  // this view never creates new placement brackets itself.
  const sectionBracketIds = Object.fromEntries(
    brackets.filter((b) => placementSections.some((s) => s.key === b.structure?.key)).map((b) => [b.structure.key, b.id])
  );

  const sectionRoundsByKey = new Map<string, WorkspaceBracketRound[]>();
  for (const section of placementSections) {
    const feederRounds = section.feederKey === null ? mainRounds : sectionRoundsByKey.get(section.feederKey) ?? section.rounds;
    const bracketId = sectionBracketIds[section.key] ?? null;
    const ownMatches = bracketId ? matches.filter((m) => m.bracket_id === bracketId) : [];
    const populated = populateSectionFromFeeder(section, feederRounds);
    sectionRoundsByKey.set(section.key, advanceWinners(applyRealMatches(populated.rounds, ownMatches)));
  }

  const actions: BracketActions = {
    isInteractive: (m: WorkspaceMatch) => matchesById.has(m.id),
    pending: false,
    onStart: () => {},
    onReport: () => {},
    onDetails: (m: WorkspaceMatch) => setDetailsId(m.id),
    onClear: () => {},
    locked: true,
  };

  return (
    <div className="space-y-10">
      <WorkspaceBracket rounds={mainRounds} actions={actions} highlightParticipantId={selectedParticipantId} />

      {placementSections.map((section) => (
        <section key={section.key}>
          <h3 className="label-mono mb-3 text-on-surface/60">{section.label}</h3>
          <WorkspaceBracket
            rounds={sectionRoundsByKey.get(section.key) ?? section.rounds}
            actions={actions}
            hideRoundLabels
            highlightParticipantId={selectedParticipantId}
          />
        </section>
      ))}

      <MatchDetailsDialog
        open={detailsId !== null}
        onOpenChange={(open) => !open && setDetailsId(null)}
        match={detailsId ? matchesById.get(detailsId) ?? null : null}
        participantsById={participantsById}
      />
    </div>
  );
}
