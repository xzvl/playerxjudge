"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WorkspaceBracket } from "@/components/dashboard/organizer/WorkspaceBracket";
import { ClearResultDialog, MatchDetailsDialog, ReportMatchDialog, type RosterLite } from "@/components/dashboard/organizer/GroupStageWorkspace";
import { useRealtimeMatches } from "@/lib/hooks/use-realtime-matches";
import { clearMatchResult, clearRoundResults, startMatch, reportMatchResult } from "@/app/account/organizer/tournament/[slug]/matches-actions";
import { advanceWinners, applyRealMatches, populateSectionFromFeeder, type PlacementSection } from "@/lib/final-stage-placeholder";
import type { WorkspaceBracketRound, WorkspaceMatch } from "@/lib/mock/tournament-workspace";
import type { Bracket, Match } from "@/lib/types/database";

// The Clear-Round confirmation — offered next to a round's title once it
// has at least one result (see WorkspaceBracket's onClearRound gate).
function ClearRoundDialog({
  round,
  onOpenChange,
  pending,
  onConfirm,
}: {
  round: WorkspaceBracketRound | null;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onConfirm: () => void;
}) {
  if (!round) return null;
  return (
    <Dialog open={round !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Clear {round.label}?</DialogTitle>
          <DialogDescription>
            This permanently clears every reported result in {round.label} — scores, winners, battle history, and
            screenshots — back to unplayed. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="p-6 pt-0">
          <Button type="button" variant="destructive" tooltip="Permanently clear this round's results" disabled={pending} onClick={onConfirm}>
            {pending ? "Clearing..." : "Clear Round"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Wraps the read-only WorkspaceBracket with the same Start/Report/Edit/Details
// icon actions the group stage's MatchesTab has. Rounds (main bracket and
// every placement section) advance on their own — reportMatchResult runs
// autoAdvanceFinalStage server-side the moment a round's last result comes
// in, so the next round's matches (and icons) just appear; there's nothing
// to click to generate them.
export function FinalStageBracketWorkspace({
  slug,
  tournamentId,
  baseRounds,
  initialMatches,
  initialBrackets,
  placementSections,
  participantsById,
  locked = false,
  highlightParticipantIds,
}: {
  slug: string;
  tournamentId: string;
  baseRounds: WorkspaceBracketRound[];
  initialMatches: Match[];
  initialBrackets: Bracket[];
  placementSections: PlacementSection[];
  participantsById: Map<string, RosterLite>;
  // The tournament has already ended — Start/Report/Edit go away everywhere,
  // Match Details stays.
  locked?: boolean;
  // Participants whose linked account is also an approved judge on this
  // tournament (see getJudgeParticipantIds) — their name gets a yellow
  // highlight so a player/judge dual role never reads as an ordinary entry.
  highlightParticipantIds?: Set<string>;
}) {
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  // Keeps `matches` live the same way GroupStageWorkspace does — scoped to
  // just the final-stage rows (group_id null) since that's all this state
  // ever held; a group-stage result reported elsewhere shouldn't leak in
  // here (group_id is what tells them apart, not bracket_id — every
  // placement-section match also has bracket_id set, but so does nothing
  // about group-stage matches, so group_id is the only reliable filter).
  useRealtimeMatches(tournamentId, setMatches, (m) => m.group_id === null);
  const [sectionBracketIds, setSectionBracketIds] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      initialBrackets
        .filter((b) => placementSections.some((s) => s.key === b.structure?.key))
        .map((b) => [b.structure.key, b.id])
    )
  );
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [clearingId, setClearingId] = useState<string | null>(null);
  const [clearingRound, setClearingRound] = useState<WorkspaceBracketRound | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const matchesById = new Map(matches.map((m) => [m.id, m]));
  const mainBracketMatches = matches.filter((m) => m.bracket_id === null);
  const mainRounds = advanceWinners(applyRealMatches(baseRounds, mainBracketMatches));

  // Every section's display rounds, computed in dependency order — a
  // section's feeder is always either the main bracket or an earlier
  // section in this list (see buildPlacementSections), so a single forward
  // pass is enough.
  const sectionRoundsByKey = new Map<string, WorkspaceBracketRound[]>();
  for (const section of placementSections) {
    const feederRounds = section.feederKey === null ? mainRounds : sectionRoundsByKey.get(section.feederKey) ?? section.rounds;
    const bracketId = sectionBracketIds[section.key] ?? null;
    const ownMatches = bracketId ? matches.filter((m) => m.bracket_id === bracketId) : [];
    const populated = populateSectionFromFeeder(section, feederRounds);
    sectionRoundsByKey.set(section.key, advanceWinners(applyRealMatches(populated.rounds, ownMatches)));
  }

  function mergeAdvanced(advancedMatches: Match[] | undefined, advancedBrackets: { key: string; id: string }[] | undefined) {
    if (advancedMatches?.length) {
      setMatches((prev) => [...prev, ...advancedMatches.filter((m) => !prev.some((p) => p.id === m.id))]);
    }
    if (advancedBrackets?.length) {
      setSectionBracketIds((prev) => {
        const next = { ...prev };
        for (const b of advancedBrackets) next[b.key] = b.id;
        return next;
      });
    }
  }

  function handleStart(match: WorkspaceMatch) {
    setError(null);
    startTransition(async () => {
      const result = await startMatch(match.id, slug);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setMatches((prev) => prev.map((m) => (m.id === match.id ? { ...m, status: "ongoing" } : m)));
    });
  }

  function handleReportSubmit(scoreA: number, scoreB: number) {
    if (!reportingId) return;
    setError(null);
    startTransition(async () => {
      const result = await reportMatchResult(reportingId, slug, scoreA, scoreB);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      if (result.match) {
        const updated = result.match;
        setMatches((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      }
      mergeAdvanced(result.advancedMatches, result.advancedBrackets);
      setReportingId(null);
    });
  }

  function handleClearConfirm() {
    if (!clearingId) return;
    setError(null);
    startTransition(async () => {
      const result = await clearMatchResult(clearingId, slug);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      if (result.match) {
        const updated = result.match;
        setMatches((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      }
      setClearingId(null);
    });
  }

  function handleClearRoundConfirm() {
    if (!clearingRound) return;
    const matchIds = clearingRound.matches.map((m) => m.id).filter((id) => matchesById.has(id));
    setError(null);
    startTransition(async () => {
      const result = await clearRoundResults(matchIds, slug);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      if (result.matches) {
        const updated = new Map(result.matches.map((m) => [m.id, m]));
        setMatches((prev) => prev.map((m) => updated.get(m.id) ?? m));
      }
      setClearingRound(null);
    });
  }

  const sharedActions = {
    isInteractive: (m: WorkspaceMatch) => matchesById.has(m.id),
    pending,
    onStart: handleStart,
    onReport: (m: WorkspaceMatch) => setReportingId(m.id),
    onDetails: (m: WorkspaceMatch) => setDetailsId(m.id),
    onClear: (m: WorkspaceMatch) => setClearingId(m.id),
    locked,
  };
  // Once the tournament has ended, results are locked — same as the
  // per-match Clear icon disappearing, the round-level one goes away too.
  const onClearRound = locked ? undefined : (round: WorkspaceBracketRound) => setClearingRound(round);

  return (
    <div className="space-y-10">
      {error ? (
        <p role="alert" className="border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <WorkspaceBracket
        rounds={mainRounds}
        actions={sharedActions}
        onClearRound={onClearRound}
        highlightParticipantIds={highlightParticipantIds}
      />

      {placementSections.map((section) => (
        <section key={section.key}>
          <h3 className="label-mono mb-3 text-on-surface/60">{section.label}</h3>
          <WorkspaceBracket
            rounds={sectionRoundsByKey.get(section.key) ?? section.rounds}
            actions={sharedActions}
            hideRoundLabels
            onClearRound={onClearRound}
            highlightParticipantIds={highlightParticipantIds}
          />
        </section>
      ))}

      <ReportMatchDialog
        open={reportingId !== null}
        onOpenChange={(open) => !open && setReportingId(null)}
        match={reportingId ? matchesById.get(reportingId) ?? null : null}
        participantsById={participantsById}
        pending={pending}
        onSubmit={handleReportSubmit}
      />
      <MatchDetailsDialog
        open={detailsId !== null}
        onOpenChange={(open) => !open && setDetailsId(null)}
        match={detailsId ? matchesById.get(detailsId) ?? null : null}
        participantsById={participantsById}
      />
      <ClearResultDialog
        open={clearingId !== null}
        onOpenChange={(open) => !open && setClearingId(null)}
        match={clearingId ? matchesById.get(clearingId) ?? null : null}
        participantsById={participantsById}
        pending={pending}
        onConfirm={handleClearConfirm}
      />
      <ClearRoundDialog
        round={clearingRound}
        onOpenChange={(open) => !open && setClearingRound(null)}
        pending={pending}
        onConfirm={handleClearRoundConfirm}
      />
    </div>
  );
}
