"use client";

import { Flag } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { FINISH_ICON, FINISH_LABEL, FINISH_POINTS, mergeBattleLog, type PlayerScoreState } from "@/components/tournaments/judge/PlayerScorePanel";

// The judge console's own preview of "Match Details" — same timeline
// treatment as the organizer's Log page and their own (submitted-result)
// MatchDetailsDialog (see GroupStageWorkspace.tsx), just built live from
// the two scorecards before Submit Result is ever pressed. A committed
// penalty never gets its own "Battle N" line (it's not a battle); it reads
// as its own "Penalty Point" entry instead, crediting the player it
// actually benefits.
export function JudgeViewResultDialog({
  open,
  onOpenChange,
  round,
  matchNumber,
  player1Name,
  player2Name,
  player1,
  player2,
  score1,
  score2,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  round: number | null;
  matchNumber: number | null;
  player1Name: string;
  player2Name: string;
  player1: PlayerScoreState;
  player2: PlayerScoreState;
  score1: number;
  score2: number;
}) {
  const entries = mergeBattleLog(player1, player2, player1Name, player2Name);
  const hi = (text: string) => <span className="font-semibold text-primary">{text}</span>;
  const strong = (text: string) => <span className="font-semibold text-on-surface">{text}</span>;
  let battleIndex = 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Match Details</DialogTitle>
          <DialogDescription>{round && matchNumber ? `Round ${round}, Match ${matchNumber}` : "No match selected"}</DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6 text-sm text-on-surface/80">
          {entries.length === 0 ? (
            <p className="text-on-surface/50">No battles scored yet.</p>
          ) : (
            <Timeline>
              {entries.map((entry, i) => {
                if (entry.kind === "penalty") {
                  return (
                    <TimelineItem key={i} icon={Flag}>
                      Penalty Point: {hi(entry.winnerName)} gets {hi("1 point")} due to {hi("2 warning/fault launches")} from{" "}
                      {strong(entry.loserName)}.
                    </TimelineItem>
                  );
                }
                battleIndex += 1;
                const points = FINISH_POINTS[entry.kind];
                return (
                  <TimelineItem key={i} icon={FINISH_ICON[entry.kind]}>
                    Battle {battleIndex}: {hi(entry.winnerName)} [{entry.winnerCombo ?? "Beyblade"}] wins by{" "}
                    {hi(`${FINISH_LABEL[entry.kind]} Finish`)} against {strong(entry.loserName)} [{entry.loserCombo ?? "Beyblade"}] and earns{" "}
                    {hi(`${points} point${points === 1 ? "" : "s"}`)}.
                  </TimelineItem>
                );
              })}
              <TimelineItem>
                Current Score: {score1} vs {score2}
              </TimelineItem>
            </Timeline>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
