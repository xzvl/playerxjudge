"use client";

import { useState } from "react";
import { ChevronDown, Medal, Trophy, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { FinalStandingRow } from "@/lib/final-stage-placeholder";
import { cn } from "@/lib/utils";

// Shared by both /tournaments/[slug]/player's own "Final Result" tab
// (PlayerStagesSection) and the organizer's Spectator Board — a completed
// tournament's definitive result should read identically everywhere it's
// shown, not as two independently-drifting implementations. Originally
// lived only in PlayerStagesSection.tsx; pulled out here once the
// Spectator Board needed the exact same board once the grand final wraps.

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
      <div className="mx-auto flex w-full flex-col items-center gap-2 border border-primary/40 bg-primary/5 p-6 text-center">
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
// rather than dumping a long list at once — unless `showAll` is set (the
// Spectator Board's own big-screen display: nothing to click there, so
// there's no "more" to reveal — every tier renders at once instead).
// `rows` is computeFinalStandings' output (best-to-worst) — same data
// Standing's final-stage table renders, just grouped and dressed up here.
// `championName` (tournaments.champion_name, snapshotted once by
// endTournament in matches-actions.ts) is preferred over rows[0] for the
// Champion card since it's the actual source of truth the rest of the app
// reads the champion from.
export function FinalResultBoard({
  rows,
  championName,
  showAll = false,
}: {
  rows: FinalStandingRow[];
  championName: string | null;
  showAll?: boolean;
}) {
  // Champion + Runner-up tiers (buildResultTiers' first two entries, when
  // present) are always shown — everything past that starts hidden, unless
  // `showAll` skips the paging entirely (see `visibleTiers`/`hasMore` below).
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
  const visibleTiers = showAll ? tiers : tiers.slice(0, revealedTiers);
  const hasMore = !showAll && revealedTiers < tiers.length;

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
