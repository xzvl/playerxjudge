import {
  ArrowLeftCircle,
  ArrowRightCircle,
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
  Siren,
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
// AchievementsGrid), highlighted once `achieved`. Five stay permanently
// locked because nothing in the schema can back them yet: `finalist`/
// `top-4`/`top-8` would need full bracket-placement standings (the same
// heavy per-tournament computation the public player view does — see
// computeFinalStandings — not something to replicate for a badge grid);
// `grand-champion`'s "national-level tournament" has no matching real tier
// (`tournament_type` only goes up to `major`/`league`); `most-likes` needs a
// likes/social feature that doesn't exist. `bird-king` *is* backed — see
// computeBirdKing (lib/player/linked-participants.ts).
export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { code: "first-match", label: "First Match", description: "Play your first official match.", icon: Flag, color: "#60a5fa" },
  { code: "rising-star", label: "Rising Star", description: "Win 20 matches.", icon: Sparkles, color: "#facc15" },
  { code: "veteran", label: "Veteran", description: "Play in 25 tournaments.", icon: ShieldCheck, color: "#b45309" },
  { code: "extreme-god", label: "Extreme God", description: "Land 50 Extreme Finishes.", icon: Flame, color: "#d946ef" },
  { code: "burst-king", label: "Burst King", description: "Land 80 Burst Finishes.", icon: Bomb, color: "#f97316" },
  { code: "pocket-master", label: "Pocket Master", description: "Land 80 Over Finishes.", icon: Rocket, color: "#22d3ee" },
  { code: "all-spin", label: "All Spin", description: "Land 100 Spin Finishes.", icon: RotateCw, color: "#6366f1" },
  { code: "swiss-king", label: "Swiss King", description: "Win a Swiss-format tournament.", icon: Layers, color: "#14b8a6" },
  { code: "finalist", label: "Finalist", description: "Reach a tournament final.", icon: Award, color: "#94a3b8" },
  { code: "top-4", label: "Top 4", description: "Finish top 4 in a tournament.", icon: Users, color: "#f59e0b" },
  { code: "top-8", label: "Top 8", description: "Finish top 8 in a tournament.", icon: ListOrdered, color: "#84cc16" },
  { code: "bird-king", label: "Bird King", description: "Finish last in your group.", icon: Feather, color: "#38bdf8" },
  { code: "casual-champion", label: "Casual Champion", description: "Win a casual tournament.", icon: PartyPopper, color: "#4ade80" },
  { code: "tournament-champion", label: "Tournament Champion", description: "Win a major tournament.", icon: Trophy, color: "#d4af37" },
  { code: "grand-champion", label: "Grand Champion", description: "Win a national-level tournament.", icon: Crown, color: "#ed0d11" },
  { code: "team-champion", label: "Team Champion", description: "Win a team-format tournament.", icon: Swords, color: "#818cf8" },
  { code: "most-likes", label: "Most Likes", description: "Receive 100+ profile likes.", icon: Heart, color: "#f472b6" },
  { code: "thanks-to-penalty", label: "Thanks to Penalty", description: "Get 20 Penalty points.", icon: Siren, color: "#fb7185" },
  { code: "x-side-master", label: "X-Side Master", description: "Win 50 Matches on X-Side.", icon: ArrowRightCircle, color: "#3b82f6" },
  { code: "b-side-master", label: "B-Side Master", description: "Win 50 Matches on B-Side.", icon: ArrowLeftCircle, color: "#a855f7" },
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

// `birdKing` is the one achievement this function can't decide on its own —
// see computeBirdKing (lib/player/linked-participants.ts), which needs its
// own async group-standings lookups the caller runs ahead of time (page.tsx)
// and passes in here. Everything else derives purely from `matches`/`linked`.
export function computeAchievements(matches: PlayerMatch[], linked: LinkedTournament[], birdKing: boolean): Achievement[] {
  const stats = computePlayerStats(matches);
  const distinctTournaments = new Set(linked.map((t) => t.tournamentId)).size;

  const achieved: Record<string, boolean> = {
    "first-match": stats.totalMatches >= 1,
    "rising-star": stats.totalWins >= 20,
    veteran: distinctTournaments >= 25,
    "extreme-god": stats.finishCounts.extreme >= 50,
    "burst-king": stats.finishCounts.burst >= 80,
    "pocket-master": stats.finishCounts.over >= 80,
    "all-spin": stats.finishCounts.spin >= 100,
    "swiss-king": linked.some((t) => t.bracketFormat === "swiss" && wasChampionOf(t)),
    finalist: false,
    "top-4": false,
    "top-8": false,
    "bird-king": birdKing,
    "casual-champion": linked.some((t) => t.tournamentType === "casual" && wasChampionOf(t)),
    "tournament-champion": linked.some((t) => t.tournamentType === "major" && wasChampionOf(t)),
    "grand-champion": false,
    "team-champion": linked.some((t) => t.battleType !== "solo" && wasChampionOf(t)),
    "most-likes": false,
    "thanks-to-penalty": stats.totalOpponentPenalties >= 20,
    "x-side-master": stats.sideWins.x >= 50,
    "b-side-master": stats.sideWins.b >= 50,
  };

  return ACHIEVEMENT_DEFS.map((def) => ({ ...def, achieved: achieved[def.code] ?? false }));
}
