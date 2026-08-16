import {
  Award,
  Bomb,
  Crown,
  Feather,
  Flag,
  Flame,
  Heart,
  Layers,
  ListOrdered,
  PartyPopper,
  Rocket,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

import { computePlayerStats } from "@/lib/player/stats";
import type { LinkedTournament, PlayerMatch } from "@/lib/player/linked-participants";

export interface AchievementDef {
  code: string;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

// The full badge catalog — every one of these always renders (see
// AchievementsGrid), highlighted once `achieved`. Six stay permanently
// locked because nothing in the schema can back them yet: `finalist`/
// `top-4`/`top-8` would need full bracket-placement standings (the same
// heavy per-tournament computation the public player view does — see
// computeFinalStandings — not something to replicate for a badge grid);
// `bird-king` needs a tracked blade "type" (Attack/Defense/Stamina) that
// doesn't exist anywhere; `grand-champion`'s "national-level tournament"
// has no matching real tier (`tournament_type` only goes up to `major`/
// `league`); `most-likes` needs a likes/social feature that doesn't exist.
export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { code: "first-match", label: "First Match", description: "Play your first official match.", icon: Flag, color: "#60a5fa" },
  { code: "rising-star", label: "Rising Star", description: "Win 5 matches.", icon: Sparkles, color: "#facc15" },
  { code: "veteran", label: "Veteran", description: "Play in 25 tournaments.", icon: ShieldCheck, color: "#b45309" },
  { code: "extreme-god", label: "Extreme God", description: "Land 10 Extreme Finishes.", icon: Flame, color: "#d946ef" },
  { code: "burst-king", label: "Burst King", description: "Land 10 Burst Finishes.", icon: Bomb, color: "#f97316" },
  { code: "pocket-master", label: "Pocket Master", description: "Land 10 Over Finishes.", icon: Rocket, color: "#22d3ee" },
  { code: "all-spin", label: "All Spin", description: "Land 10 Spin Finishes.", icon: RotateCw, color: "#6366f1" },
  { code: "swiss-king", label: "Swiss King", description: "Win a Swiss-format tournament.", icon: Layers, color: "#14b8a6" },
  { code: "finalist", label: "Finalist", description: "Reach a tournament final.", icon: Award, color: "#94a3b8" },
  { code: "top-4", label: "Top 4", description: "Finish top 4 in a tournament.", icon: Users, color: "#f59e0b" },
  { code: "top-8", label: "Top 8", description: "Finish top 8 in a tournament.", icon: ListOrdered, color: "#84cc16" },
  { code: "bird-king", label: "Bird King", description: "Win with an Attack-type blade.", icon: Feather, color: "#38bdf8" },
  { code: "casual-champion", label: "Casual Champion", description: "Win a casual tournament.", icon: PartyPopper, color: "#4ade80" },
  { code: "tournament-champion", label: "Tournament Champion", description: "Win a major tournament.", icon: Trophy, color: "#d4af37" },
  { code: "grand-champion", label: "Grand Champion", description: "Win a national-level tournament.", icon: Crown, color: "#ed0d11" },
  { code: "team-champion", label: "Team Champion", description: "Win a team-format tournament.", icon: Swords, color: "#818cf8" },
  { code: "most-likes", label: "Most Likes", description: "Receive 100+ profile likes.", icon: Heart, color: "#f472b6" },
];

export interface Achievement extends AchievementDef {
  achieved: boolean;
}

// A tournament's champion is only recorded as a free-text name snapshot
// (`tournaments.champion_name`, set from a `tournament_participants` row's
// name/team_name at completion time — see endTournament in
// matches-actions.ts), not a stable id — so "was I the champion" is a
// best-effort name match against the same roster entry I'm linked to.
function wasChampionOf(t: LinkedTournament): boolean {
  return !!t.championName && t.championName === t.participantName;
}

export function computeAchievements(matches: PlayerMatch[], linked: LinkedTournament[]): Achievement[] {
  const stats = computePlayerStats(matches);
  const distinctTournaments = new Set(linked.map((t) => t.tournamentId)).size;

  const achieved: Record<string, boolean> = {
    "first-match": stats.totalMatches >= 1,
    "rising-star": stats.totalWins >= 5,
    veteran: distinctTournaments >= 25,
    "extreme-god": stats.finishCounts.extreme >= 10,
    "burst-king": stats.finishCounts.burst >= 10,
    "pocket-master": stats.finishCounts.over >= 10,
    "all-spin": stats.finishCounts.spin >= 10,
    "swiss-king": linked.some((t) => t.bracketFormat === "swiss" && wasChampionOf(t)),
    finalist: false,
    "top-4": false,
    "top-8": false,
    "bird-king": false,
    "casual-champion": linked.some((t) => t.tournamentType === "casual" && wasChampionOf(t)),
    "tournament-champion": linked.some((t) => t.tournamentType === "major" && wasChampionOf(t)),
    "grand-champion": false,
    "team-champion": linked.some((t) => t.battleType !== "solo" && wasChampionOf(t)),
    "most-likes": false,
  };

  return ACHIEVEMENT_DEFS.map((def) => ({ ...def, achieved: achieved[def.code] ?? false }));
}
