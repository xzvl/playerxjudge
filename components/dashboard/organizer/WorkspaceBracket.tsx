"use client";

import type { ReactNode } from "react";
import { Eraser, Info, Pencil, Play, Square, Swords, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDragScroll } from "@/lib/hooks/use-drag-scroll";
import { cn } from "@/lib/utils";
import type { WorkspaceBracketRound, WorkspaceMatch, WorkspaceParticipant } from "@/lib/mock/tournament-workspace";

// Wires up hover action icons (Start / Report / Edit / Clear / Details) on
// whichever matches `isInteractive` returns true for — real Round 1 matches
// on the Final Stage page once it's started, per FinalStageBracketWorkspace.
// Any other consumer that doesn't pass `actions` gets the plain read-only
// card this component has always rendered.
export interface BracketActions {
  isInteractive: (match: WorkspaceMatch) => boolean;
  pending: boolean;
  onStart: (match: WorkspaceMatch) => void;
  // Reverts a mistakenly-started match back to unplayed — only offered
  // while it's actually in progress (see BracketMatchCard's render gate).
  onStop: (match: WorkspaceMatch) => void;
  onReport: (match: WorkspaceMatch) => void;
  onDetails: (match: WorkspaceMatch) => void;
  // Wipes a completed match's score/winner back to unplayed — only ever
  // offered when `hasScore` (see BracketMatchCard) is true.
  onClear: (match: WorkspaceMatch) => void;
  // Once the tournament is finished, Start/Report/Edit/Clear no longer make
  // sense — only Match Details stays available.
  locked?: boolean;
}

function ParticipantLine({ participant, highlight }: { participant: WorkspaceParticipant | null; highlight?: boolean }) {
  if (!participant) return <span className="text-sm text-on-surface/40">TBD</span>;
  return (
    <span className="flex min-w-0 items-center gap-2 text-sm">
      <span className="text-xs flex h-6 w-6 shrink-0 items-center justify-center bg-surface-container-high text-on-surface/40">{participant.seed}</span>
      <span className={cn("truncate text-xs text-on-surface", highlight && "bg-yellow-400/30 px-1")}>{participant.teamName ?? participant.name}</span>
    </span>
  );
}

function ScoreChip({ value, isWinner, isLoser }: { value: number; isWinner: boolean; isLoser: boolean }) {
  return (
    <span
      className={cn(
        "label-mono flex h-6 w-6 shrink-0 items-center justify-center",
        isWinner && "bg-primary/20 font-bold text-primary",
        isLoser && "bg-surface-container-high text-on-surface/40"
      )}
    >
      {value}
    </span>
  );
}

function BracketMatchCard({
  match,
  displayNumber,
  actions,
  highlightParticipantId,
  highlightParticipantIds,
}: {
  match: WorkspaceMatch;
  // "Match #" badge — a global sequence across the whole final stage (see
  // buildFinalStageMatchNumberPlan) when the caller has one, falling back
  // to a plain round-local position for previews/placeholders that don't.
  displayNumber: number;
  actions?: BracketActions;
  highlightParticipantId?: string | null;
  // See ParticipantLine's `highlight` — participants whose linked account
  // is also an approved judge on this tournament, resolved to a plain
  // per-side boolean below since a match card only ever shows two names.
  highlightParticipantIds?: Set<string>;
}) {
  const hasScore = match.scoreA !== null && match.scoreB !== null;
  const aWins = hasScore && match.winnerId !== null && match.a?.id === match.winnerId;
  const bWins = hasScore && match.winnerId !== null && match.b?.id === match.winnerId;
  const interactive = !!actions && match.a !== null && match.b !== null && actions.isInteractive(match);
  const isSelectedMatch =
    !!highlightParticipantId && (match.a?.id === highlightParticipantId || match.b?.id === highlightParticipantId);

  return (
    <div
      className={cn(
        "group relative border lg:p-1",
        match.status === "in_progress" ? "border-primary/60 bg-primary/5" : "border-outline-variant/25 bg-surface-container-low",
        isSelectedMatch && "ring-2 ring-primary/70"
      )}
    >
      <div className="flex min-h-[50px] items-center gap-3">
        <span className="w-6 shrink-0 text-center font-mono text-xs text-on-surface/40">{displayNumber}</span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center justify-between gap-2">
            <ParticipantLine participant={match.a} highlight={!!match.a && highlightParticipantIds?.has(match.a.id)} />
            {hasScore ? <ScoreChip value={match.scoreA!} isWinner={aWins} isLoser={bWins} /> : null}
          </div>
          <div className="flex items-center justify-between gap-2">
            <ParticipantLine participant={match.b} highlight={!!match.b && highlightParticipantIds?.has(match.b.id)} />
            {hasScore ? <ScoreChip value={match.scoreB!} isWinner={bWins} isLoser={aWins} /> : null}
          </div>
        </div>
      </div>
      {match.stationName && match.status === "complete" ? (
        <p className="label-mono border-t border-outline-variant/15 px-1 py-1 text-[10px] text-on-surface/30">
          {match.stationName}
          {match.finishType ? ` · ${match.finishType} finish` : ""}
        </p>
      ) : null}

      {interactive && actions ? (
        <div className="pointer-events-none absolute left-full top-1/2 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 z-20">
          <div className="flex items-center gap-1 border border-outline-variant/40 bg-surface-container-lowest p-1 shadow-lg">
            {!actions.locked && match.status === "pending" ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Start match"
                disabled={actions.pending}
                onClick={() => actions.onStart(match)}
              >
                <Play className="h-3.5 w-3.5" />
              </Button>
            ) : null}
            {!actions.locked && match.status === "in_progress" ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Stop match"
                disabled={actions.pending}
                onClick={() => actions.onStop(match)}
              >
                <Square className="h-3.5 w-3.5" />
              </Button>
            ) : null}
            {actions.locked ? null : match.status !== "complete" ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Report result"
                disabled={actions.pending}
                onClick={() => actions.onReport(match)}
              >
                <Swords className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Edit result"
                disabled={actions.pending}
                onClick={() => actions.onReport(match)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {!actions.locked && match.status === "complete" ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Clear result"
                disabled={actions.pending}
                onClick={() => actions.onClear(match)}
              >
                <Eraser className="h-3.5 w-3.5" />
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Match details"
              disabled={actions.pending}
              onClick={() => actions.onDetails(match)}
            >
              <Info className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Header placeholder matching the round label's own height/spacing exactly,
// so a connector column's line area lines up vertically with its neighbors'
// match area (both start below an equal-height header row).
function ColumnHeader({ children, onClear }: { children?: ReactNode; onClear?: () => void }) {
  if (!children) {
    return (
      <p className="label-mono sticky top-0 select-none bg-surface py-1 text-center text-on-surface/40" aria-hidden="true">
        {String.fromCharCode(160)}
      </p>
    );
  }

  return (
    <div className="sticky top-0 flex items-center justify-center gap-1.5 bg-surface py-1">
      <p className="label-mono select-none text-center text-on-surface/40">{children}</p>
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear all results for this round"
          title="Clear all results for this round"
          className="text-on-surface/30 transition-colors hover:text-destructive"
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  );
}

// Bracket connector lines between two adjacent round columns: for every pair
// of matches in the earlier round, draws the two feeder stubs, the vertical
// bar joining them, and the outgoing stub into the match they advance to.
// `justify-around` spaces every round's matches evenly across the same
// shared column height, so each match's vertical center is exactly
// (index + 0.5) / matchCount — no DOM measurement needed to line these up.
function RoundConnector({ matchCount }: { matchCount: number }) {
  const pairs = Array.from({ length: matchCount / 2 }, (_, i) => {
    const top = ((2 * i + 0.5) / matchCount) * 100;
    const bottom = ((2 * i + 1.5) / matchCount) * 100;
    return { top, bottom, mid: (top + bottom) / 2 };
  });

  return (
    <div className="flex w-6 shrink-0 flex-col gap-3" aria-hidden="true">
      <ColumnHeader />
      <div className="relative flex-1">
        {pairs.map(({ top, bottom, mid }, i) => (
          <div key={i}>
            <div className="absolute left-0 h-px w-1/2 bg-outline-variant/40" style={{ top: `${top}%` }} />
            <div className="absolute left-0 h-px w-1/2 bg-outline-variant/40" style={{ top: `${bottom}%` }} />
            <div className="absolute left-1/2 w-px bg-outline-variant/40" style={{ top: `${top}%`, height: `${bottom - top}%` }} />
            <div className="absolute right-0 h-px w-1/2 bg-outline-variant/40" style={{ top: `${mid}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function WorkspaceBracket({
  rounds,
  actions,
  hideRoundLabels,
  highlightParticipantId,
  highlightParticipantIds,
  onClearRound,
  matchNumbers,
}: {
  rounds: WorkspaceBracketRound[];
  actions?: BracketActions;
  // Placement sections already have their own heading (e.g. "3rd Place
  // Match") above the whole bracket — a per-column "Round N" on top of that
  // is redundant, so FinalStageBracketWorkspace turns it off there.
  hideRoundLabels?: boolean;
  // Rings whichever match this participant is seated in — used by the
  // player view to call out the selected participant's own matches amid
  // the full bracket (see PlayerFinalStageView).
  highlightParticipantId?: string | null;
  // Participants whose linked account is also an approved judge on this
  // tournament (see getJudgeParticipantIds) — their name gets a yellow
  // highlight, independent of (and stackable with) the ring above.
  highlightParticipantIds?: Set<string>;
  // The round header's Clear icon — wipes every match in that round back to
  // unplayed (see clearRoundResults). Only offered alongside a visible
  // round label (so it never shows when hideRoundLabels is set), and only
  // when the round actually has a result to clear.
  onClearRound?: (round: WorkspaceBracketRound) => void;
  // The "Match #" badge for each match, keyed `${roundIndex}-${matchIndex}`
  // — see buildFinalStageMatchNumberPlan's `main`/`placement[key]` maps.
  // Falls back to a plain round-local position (the old behavior) when
  // omitted, for previews/placeholders with no real bracket shape to plan
  // from (the mock-derived Final Stage preview, and the not-yet-started
  // placeholder bracket).
  matchNumbers?: Map<string, number>;
}) {
  const scrollRef = useDragScroll<HTMLDivElement>();

  if (rounds.length === 0) {
    return (
      <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
        The bracket will appear once seeding is complete.
      </p>
    );
  }

  return (
    <div ref={scrollRef} className="flex max-h-[85vh] lg:max-h-[75vh] cursor-grab select-none overflow-auto px-1 pb-4 active:cursor-grabbing">
      {rounds.map((round, r) => (
        <div key={round.label} className="flex shrink-0">
          {r > 0 ? <RoundConnector matchCount={rounds[r - 1].matches.length} /> : null}
          <div className="flex w-64 shrink-0 flex-col gap-3">
            <ColumnHeader
              onClear={
                !hideRoundLabels && onClearRound && round.matches.some((m) => m.scoreA !== null || m.scoreB !== null)
                  ? () => onClearRound(round)
                  : undefined
              }
            >
              {hideRoundLabels ? undefined : round.label}
            </ColumnHeader>
            <div className="flex flex-1 flex-col justify-around gap-3">
              {round.matches.map((match, i) => (
                <BracketMatchCard
                  key={match.id}
                  match={match}
                  displayNumber={matchNumbers?.get(`${r}-${i}`) ?? i + 1}
                  actions={actions}
                  highlightParticipantId={highlightParticipantId}
                  highlightParticipantIds={highlightParticipantIds}
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
