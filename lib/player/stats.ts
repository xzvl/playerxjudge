import type { PlayerMatch } from "@/lib/player/linked-participants";
import type { FinishType } from "@/lib/types/database";

export const FINISH_TYPE_LABELS: Record<FinishType, string> = {
  spin: "Spin Finish",
  burst: "Burst Finish",
  over: "Over Finish",
  extreme: "Extreme Finish",
};

export interface PlayerStats {
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  totalMatches: number;
  finishCounts: Record<FinishType, number>;
  totalTeamBattles: number;
}

export function computePlayerStats(matches: PlayerMatch[]): PlayerStats {
  const finishCounts: Record<FinishType, number> = { spin: 0, burst: 0, over: 0, extreme: 0 };
  for (const match of matches) {
    for (const finish of match.myBattleWins) finishCounts[finish] += 1;
  }

  return {
    totalWins: matches.filter((m) => m.result === "won").length,
    totalLosses: matches.filter((m) => m.result === "lost").length,
    totalDraws: matches.filter((m) => m.result === "draw").length,
    totalMatches: matches.length,
    finishCounts,
    totalTeamBattles: matches.filter((m) => m.battleType !== "solo").length,
  };
}
