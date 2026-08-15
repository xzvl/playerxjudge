"use client";

import { ArrowUpCircle, Flame, Minus, Plus, RotateCw, Zap } from "lucide-react";

import { cn } from "@/lib/utils";
import type { FinishType } from "@/lib/types/database";

// `seq` is a global (both-sides-shared) monotonic counter assigned by
// JudgeConsole at commit time — Switch swaps these whole per-player states
// between sides, so ordering can't live in "array position" alone; `seq`
// is what lets the two sides' events be merged back into one true
// chronological battle log at submit time regardless of which side either
// event currently lives on.
export type BoxEvent = { kind: FinishType | "penalty"; seq: number };

export interface PlayerScoreState {
  participantId: string | null;
  // Log of every scored battle (and committed penalty) for this side —
  // everything else (score, boxes) is derived from this. A stepper's `-`
  // removes the most recent entry of *its own* kind, not just the array's
  // last element, so each stepper's undo stays scoped to itself.
  events: BoxEvent[];
  // The penalty stepper's own uncommitted half: 0 or 1 presses in. A
  // second press commits (pushes a "penalty" event, resets this to 0).
  penaltyProgress: 0 | 1;
}

export function emptyPlayerScoreState(): PlayerScoreState {
  return { participantId: null, events: [], penaltyProgress: 0 };
}

// Official point values (app/rules/page.tsx's Scoring System table).
export const FINISH_POINTS: Record<FinishType, number> = { spin: 1, over: 2, burst: 2, extreme: 3 };

export const FINISH_LABEL: Record<FinishType, string> = { spin: "Spin", over: "Over", burst: "Burst", extreme: "Extreme" };

export const FINISH_ICON: Record<FinishType, typeof RotateCw> = { spin: RotateCw, over: ArrowUpCircle, burst: Zap, extreme: Flame };

const FINISH_ORDER: FinishType[] = ["spin", "over", "burst", "extreme"];

// The fixed 8-box scorecard grid, grouped into rows of this many boxes each.
const BOX_ROWS = [1, 1, 2, 2, 2];

export function ownScore(state: PlayerScoreState): number {
  return state.events.reduce((sum, e) => (e.kind === "penalty" ? sum : sum + FINISH_POINTS[e.kind]), 0);
}

export function committedPenalties(state: PlayerScoreState): number {
  return state.events.filter((e) => e.kind === "penalty").length;
}

// One entry in the chronological, name-attributed battle log the View
// Result popup narrates — same idea as the id-based merge JudgeConsole
// builds for the actual submission, but keyed to display names and with
// penalties flipped the way they read out loud: a "penalty" event lives in
// the *offending* player's own `events` (see BoxEvent's doc comment above),
// but the point it's worth belongs to their opponent, so `winnerName` here
// is always who benefits and `loserName` is always who's at fault.
export interface MergedLogEntry {
  kind: FinishType | "penalty";
  winnerName: string;
  loserName: string;
}

export function mergeBattleLog(aState: PlayerScoreState, bState: PlayerScoreState, aName: string, bName: string): MergedLogEntry[] {
  const withNames = [
    ...aState.events.map((e) => ({ ...e, ownerName: aName, opponentName: bName })),
    ...bState.events.map((e) => ({ ...e, ownerName: bName, opponentName: aName })),
  ].sort((x, y) => x.seq - y.seq);

  return withNames.map((e) =>
    e.kind === "penalty"
      ? { kind: e.kind, winnerName: e.opponentName, loserName: e.ownerName }
      : { kind: e.kind, winnerName: e.ownerName, loserName: e.opponentName }
  );
}

// A battle fills as many boxes as it's worth — a 1pt Spin fills one, a 3pt
// Extreme fills three — rather than always just one box per battle. Each
// of those boxes shows the same icon, like marking off individual points
// on a physical scorecard.
//
// A committed "penalty" event lives in the *offending* player's own
// `events` (see BoxEvent's doc comment above), but the point it's worth
// belongs to their opponent — so it's excluded here and `bonusPenalties`
// (the opponent's own committedPenalties count, passed in by JudgeConsole)
// fills the "P" box on this side instead. A "P" box in a player's grid
// always means "a point gained from the opponent's fault," never "I was
// penalized."
function expandToBoxFills(events: BoxEvent[], bonusPenalties: number): BoxEvent[] {
  const fills: BoxEvent[] = [];
  for (const event of events) {
    if (event.kind === "penalty") continue;
    for (let i = 0; i < FINISH_POINTS[event.kind]; i++) fills.push(event);
  }
  for (let i = 0; i < bonusPenalties; i++) fills.push({ kind: "penalty", seq: -1 });
  return fills;
}

function BoxCell({ event }: { event: BoxEvent | undefined }) {
  if (!event) {
    return <div className="h-12 w-full border border-dashed border-outline-variant/30" />;
  }
  if (event.kind === "penalty") {
    return (
      <div className="flex h-12 w-full items-center justify-center border border-amber-500 bg-amber-500/20 font-mono text-sm font-bold text-amber-400">
        P
      </div>
    );
  }
  const Icon = FINISH_ICON[event.kind];
  return (
    <div className="flex h-12 w-full items-center justify-center border border-primary bg-primary/15 text-primary">
      <Icon className="h-4 w-4" aria-hidden="true" />
    </div>
  );
}

function Stepper({ label, points, value, onPlus, onMinus }: { label: string; points: string; value: number; onPlus: () => void; onMinus: () => void }) {
  return (
    <div className="lg:flex items-center justify-between gap-2 border border-outline-variant/20 bg-surface-container-lowest px-2 py-2">
      <div className="flex justify-between mb-2 gap-1 lg:gap-2">
        <p className="text-xs font-medium text-on-surface">{label}</p>
        <p className="label-mono text-[9px] text-on-surface/40">{points}</p>
      </div>
      <div className="flex justify-between gap-1 lg:gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={onMinus}
          className="flex h-6 w-6 items-center justify-center border border-outline-variant/40 text-on-surface/60 transition-colors hover:border-primary hover:text-primary"
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="w-4 text-center font-mono text-sm text-on-surface">{value}</span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={onPlus}
          className="flex h-6 w-6 items-center justify-center border border-outline-variant/40 text-on-surface/60 transition-colors hover:border-primary hover:text-primary"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export function PlayerScorePanel({
  state,
  bonusPenalties,
  onIncrementFinish,
  onDecrementFinish,
  onPenaltyPlus,
  onPenaltyMinus,
}: {
  state: PlayerScoreState;
  // The opponent's own committedPenalties count — see expandToBoxFills.
  bonusPenalties: number;
  onIncrementFinish: (kind: FinishType) => void;
  onDecrementFinish: (kind: FinishType) => void;
  onPenaltyPlus: () => void;
  onPenaltyMinus: () => void;
}) {
  const boxed = expandToBoxFills(state.events, bonusPenalties).slice(0, 8);
  let cursor = 0;

  return (
    <div className="space-y-2 lg:space-y-5">
      <div className="w-full space-y-1.5">
        {BOX_ROWS.map((count, rowIndex) => {
          const cells = Array.from({ length: count }, () => boxed[cursor++]);
          return (
            <div key={rowIndex} className={cn("grid w-full gap-1.5", count === 1 ? "grid-cols-1" : "grid-cols-2")}>
              {cells.map((event, i) => (
                <BoxCell key={i} event={event} />
              ))}
            </div>
          );
        })}
      </div>

      <div className="space-y-1 lg:space-y-2">
        {FINISH_ORDER.map((kind) => (
          <Stepper
            key={kind}
            label={FINISH_LABEL[kind]}
            points={`${FINISH_POINTS[kind]}pt`}
            value={state.events.filter((e) => e.kind === kind).length}
            onPlus={() => onIncrementFinish(kind)}
            onMinus={() => onDecrementFinish(kind)}
          />
        ))}
        <Stepper label="Penalty" points="rnd" value={state.penaltyProgress} onPlus={onPenaltyPlus} onMinus={onPenaltyMinus} />
      </div>
    </div>
  );
}
