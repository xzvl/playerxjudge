"use client";

import { useState } from "react";
import { Camera, Info } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MatchDetailsDialog, type RosterLite } from "@/components/dashboard/organizer/GroupStageWorkspace";
import { FINISH_LABEL, rankedFinishes, type FinishCounts } from "@/lib/player-view-stats";
import { cn } from "@/lib/utils";
import type { Match, MatchScore } from "@/lib/types/database";
import type { StandingsRow } from "@/lib/swiss";

function initials(name: string) {
  const parts = name.replace(/^Team\s+/i, "").trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function isScore(value: Match["score"]): value is MatchScore {
  return typeof value === "object" && value !== null && "a" in value && "b" in value;
}

// `compact` shrinks the pills further for the Previous Matches recap cards,
// where the finish tags sit alongside a round label, stage badge, and score
// in an already-dense card.
function FinishTags({ counts, compact }: { counts: FinishCounts; compact?: boolean }) {
  const ranked = rankedFinishes(counts).slice(0, 2);
  const sizing = compact ? "px-1.5 py-0.5 !text-[8px]" : "px-2 py-1 text-[10px]";
  if (ranked.length === 0) {
    return <span className={cn("label-mono border border-outline-variant/30 text-on-surface/40", sizing)}>No available finishes</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {ranked.map((f, i) => (
        <span
          key={f.type}
          className={cn("label-mono", sizing, i === 0 ? "bg-primary/15 text-primary" : "border border-outline-variant/30 text-on-surface/60")}
        >
          {f.count} {FINISH_LABEL[f.type]}
        </span>
      ))}
    </div>
  );
}

// One "know your opponent" card in the Upcoming Matches grid — opponent's
// identity, their most common finishes tournament-wide, and their current
// group standing snapshot.
export function UpcomingMatchCard({
  roundLabel,
  stageLabel,
  opponentName,
  opponentFinishes,
  opponentRow,
}: {
  roundLabel: string;
  stageLabel: string;
  opponentName: string;
  opponentFinishes: FinishCounts;
  opponentRow: StandingsRow | null;
}) {
  return (
    <div className="flex flex-col gap-3 border border-outline-variant/25 bg-surface-container-low p-4">
      <div className="label-mono flex items-center justify-between text-[10px] text-on-surface/40">
        <span>{roundLabel}</span>
        <span>{stageLabel}</span>
      </div>
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>{initials(opponentName)}</AvatarFallback>
        </Avatar>
        <span className="font-inter font-bold text-[13px] truncate underline-offset-2 transition-colors leading-tight">{opponentName}</span>
      </div>
      <FinishTags counts={opponentFinishes} />
      <div className="border-t border-outline-variant/15 pt-3">
        {opponentRow ? (
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="font-mono text-lg font-bold text-on-surface">
                {opponentRow.wins}-{opponentRow.losses}-{opponentRow.ties}
              </p>
              <p className="label-mono mt-0.5 text-[9px] text-on-surface/40">W-L-T</p>
            </div>
            <div>
              <p className="font-mono text-lg font-bold text-on-surface">{opponentRow.score}</p>
              <p className="label-mono mt-0.5 text-[9px] text-on-surface/40">Score</p>
            </div>
            <div>
              <p className="font-mono text-lg font-bold text-on-surface">{opponentRow.tieBreak1}</p>
              <p className="label-mono mt-0.5 text-[9px] text-on-surface/40">TB #1</p>
            </div>
            <div>
              <p className="font-mono text-lg font-bold text-on-surface">{opponentRow.tieBreak2}</p>
              <p className="label-mono mt-0.5 text-[9px] text-on-surface/40">TB #2</p>
            </div>
          </div>
        ) : (
          <p className="text-center text-xs text-on-surface/30">No standings yet</p>
        )}
      </div>
    </div>
  );
}

// One recap card in the Previous Matches grid — who they played, what they
// finished with in that match, and the result.
export function PreviousMatchCard({
  roundLabel,
  stageLabel,
  opponentName,
  match,
  playerFinishes,
  won,
  score,
  participantsById,
}: {
  roundLabel: string;
  stageLabel: string;
  opponentName: string;
  match: Match;
  playerFinishes: FinishCounts;
  won: boolean;
  score: { mine: number; theirs: number } | null;
  participantsById: Map<string, RosterLite>;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const screenshotUrl = isScore(match.score) ? match.score.screenshotUrl : undefined;

  return (
    <div className="flex flex-col gap-3 border border-outline-variant/25 bg-surface-container-low p-4">
      <div className="label-mono flex items-center justify-between text-[10px]">
        <span className="text-on-surface/40">{roundLabel}</span>
        <span
          className={cn(
            "px-2 py-1",
            stageLabel === "Final" ? "bg-primary/15 text-primary" : "bg-surface-container-high text-on-surface/50"
          )}
        >
          {stageLabel}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>{initials(opponentName)}</AvatarFallback>
        </Avatar>
        <span className="font-inter font-bold text-[13px] truncate underline-offset-2 transition-colors leading-tight">{opponentName}</span>
      </div>
      <FinishTags counts={playerFinishes} compact />
      <div className="flex items-center justify-between border-t border-outline-variant/15 pt-3">
        <span className={`label-mono px-2 py-1 text-[10px] ${won ? "bg-emerald-600/80 text-white" : "bg-error text-on-error"}`}>
          {won ? "Win" : "Lost"}
        </span>
        {score ? (
          <span className="font-mono text-sm text-on-surface/70">
            Score: <span className="font-bold text-primary">{score.mine}</span>-{score.theirs}
          </span>
        ) : null}
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" aria-label="Match result" onClick={() => setDetailsOpen(true)}>
            <Info className="h-3.5 w-3.5" />
          </Button>
          {screenshotUrl ? (
            <Button type="button" variant="ghost" size="icon" aria-label="Match screenshot" asChild>
              <a href={screenshotUrl} target="_blank" rel="noreferrer">
                <Camera className="h-3.5 w-3.5" />
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      <MatchDetailsDialog open={detailsOpen} onOpenChange={setDetailsOpen} match={match} participantsById={participantsById} />
    </div>
  );
}
