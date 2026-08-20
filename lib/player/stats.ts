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
  // Wins broken out by which seat the player occupied — see PlayerMatch's
  // `mySide`. Backs the x-side-master/b-side-master achievements.
  sideWins: { x: number; b: number };
  // Penalty points the player caused their *opponents* to take, summed
  // across every match — see PlayerMatch's `opponentPenalties`. Backs the
  // "Thanks to Penalty" achievement.
  totalOpponentPenalties: number;
}

export function computePlayerStats(matches: PlayerMatch[]): PlayerStats {
  const finishCounts: Record<FinishType, number> = { spin: 0, burst: 0, over: 0, extreme: 0 };
  const sideWins = { x: 0, b: 0 };
  let totalOpponentPenalties = 0;
  for (const match of matches) {
    for (const finish of match.myBattleWins) finishCounts[finish] += 1;
    if (match.result === "won") {
      if (match.mySide === "a") sideWins.x += 1;
      else sideWins.b += 1;
    }
    totalOpponentPenalties += match.opponentPenalties;
  }

  return {
    totalWins: matches.filter((m) => m.result === "won").length,
    totalLosses: matches.filter((m) => m.result === "lost").length,
    totalDraws: matches.filter((m) => m.result === "draw").length,
    totalMatches: matches.length,
    finishCounts,
    totalTeamBattles: matches.filter((m) => m.battleType !== "solo").length,
    sideWins,
    totalOpponentPenalties,
  };
}
