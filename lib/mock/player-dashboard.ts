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

import type { BattleType } from "@/lib/types/database";

// Mirrors the mock-data convention in `lib/mock/tournaments.ts` — there are
// no Supabase tables yet for matches, registrations, achievements, or
// community-membership history, so the player dashboard runs on typed mock
// data until that backend lands. Real profile fields (province, photos)
// still get threaded through from the caller for personalization.

export type FinishType = "spin" | "burst" | "over" | "extreme";

export const FINISH_TYPE_LABELS: Record<FinishType, string> = {
  spin: "Spin Finish",
  burst: "Burst Finish",
  over: "Over Finish",
  extreme: "Extreme Finish",
};

export interface MockMatch {
  id: string;
  tournamentTitle: string;
  opponent: string;
  result: "won" | "lost";
  finishType: FinishType;
  battleType: BattleType;
  round: string;
  playedAt: string;
}

export const MOCK_MATCHES: MockMatch[] = [
  { id: "m1", tournamentTitle: "Laguna Regional Finals", opponent: "N. Bautista", result: "won", finishType: "extreme", battleType: "solo", round: "Grand Final", playedAt: "2026-07-24T14:20:00.000Z" },
  { id: "m2", tournamentTitle: "Laguna Regional Finals", opponent: "R. Aquino", result: "won", finishType: "spin", battleType: "solo", round: "Semifinal", playedAt: "2026-07-24T12:40:00.000Z" },
  { id: "m3", tournamentTitle: "Laguna Regional Finals", opponent: "J. Reyes", result: "won", finishType: "burst", battleType: "solo", round: "Quarterfinal", playedAt: "2026-07-24T11:10:00.000Z" },
  { id: "m4", tournamentTitle: "Iloilo Squad Battle 5v5", opponent: "Team Aetherblade", result: "lost", finishType: "over", battleType: "5v5", round: "Grand Final", playedAt: "2026-07-09T15:30:00.000Z" },
  { id: "m5", tournamentTitle: "Iloilo Squad Battle 5v5", opponent: "Team Ironclad", result: "won", finishType: "spin", battleType: "5v5", round: "Semifinal", playedAt: "2026-07-09T13:15:00.000Z" },
  { id: "m6", tournamentTitle: "Davao Casual Friday", opponent: "P. Ramos", result: "won", finishType: "burst", battleType: "solo", round: "Round 4", playedAt: "2026-06-05T13:00:00.000Z" },
  { id: "m7", tournamentTitle: "Davao Casual Friday", opponent: "M. Santos", result: "lost", finishType: "spin", battleType: "solo", round: "Round 3", playedAt: "2026-06-05T12:20:00.000Z" },
  { id: "m8", tournamentTitle: "Davao Casual Friday", opponent: "A. Cruz", result: "won", finishType: "extreme", battleType: "solo", round: "Round 2", playedAt: "2026-06-05T11:40:00.000Z" },
  { id: "m9", tournamentTitle: "Davao Casual Friday", opponent: "K. Villareal", result: "won", finishType: "spin", battleType: "solo", round: "Round 1", playedAt: "2026-06-05T11:00:00.000Z" },
  { id: "m10", tournamentTitle: "Pampanga Emergency Showdown", opponent: "Team Voltbreak", result: "won", finishType: "burst", battleType: "3v3", round: "Final", playedAt: "2026-05-14T14:00:00.000Z" },
  { id: "m11", tournamentTitle: "Pampanga Emergency Showdown", opponent: "Team Overdrive", result: "won", finishType: "over", battleType: "3v3", round: "Semifinal", playedAt: "2026-05-14T13:00:00.000Z" },
  { id: "m12", tournamentTitle: "Cebu Tag Clash 2v2", opponent: "Team Ignis", result: "lost", finishType: "extreme", battleType: "2v2", round: "Final", playedAt: "2026-04-02T15:45:00.000Z" },
  { id: "m13", tournamentTitle: "Cebu Tag Clash 2v2", opponent: "Team Frostbyte", result: "won", finishType: "spin", battleType: "2v2", round: "Semifinal", playedAt: "2026-04-02T14:20:00.000Z" },
  { id: "m14", tournamentTitle: "Metro Manila Open X", opponent: "D. Manalo", result: "won", finishType: "burst", battleType: "solo", round: "Round 3", playedAt: "2026-03-01T12:30:00.000Z" },
  { id: "m15", tournamentTitle: "Metro Manila Open X", opponent: "L. Villanueva", result: "lost", finishType: "over", battleType: "solo", round: "Round 2", playedAt: "2026-03-01T11:50:00.000Z" },
];

export interface MockRegistration {
  tournamentId: string;
  registeredAt: string;
}

// tournamentId cross-references `MOCK_TOURNAMENTS` in lib/mock/tournaments.ts.
export const MOCK_REGISTRATIONS: MockRegistration[] = [
  { tournamentId: "t1", registeredAt: "2026-07-20T09:00:00.000Z" },
  { tournamentId: "t2", registeredAt: "2026-07-28T10:15:00.000Z" },
  { tournamentId: "t5", registeredAt: "2026-07-10T08:30:00.000Z" },
  { tournamentId: "t6", registeredAt: "2026-06-25T09:45:00.000Z" },
];

export interface PlayerStats {
  totalWins: number;
  totalLosses: number;
  totalMatches: number;
  finishCounts: Record<FinishType, number>;
  totalTeamBattles: number;
  totalLikes: number;
}

export function computePlayerStats(matches: MockMatch[]): PlayerStats {
  const wins = matches.filter((m) => m.result === "won");
  const finishCounts: Record<FinishType, number> = { spin: 0, burst: 0, over: 0, extreme: 0 };
  for (const match of wins) finishCounts[match.finishType] += 1;

  return {
    totalWins: wins.length,
    totalLosses: matches.length - wins.length,
    totalMatches: matches.length,
    finishCounts,
    totalTeamBattles: matches.filter((m) => m.battleType !== "solo").length,
    totalLikes: 342,
  };
}

export const PLAYER_STATS = computePlayerStats(MOCK_MATCHES);

export interface MockCommunityMembership {
  communityName: string;
  province: string;
  startedAt: string;
  endedAt: string | null;
}

export const MOCK_COMMUNITY_MEMBERSHIPS: MockCommunityMembership[] = [
  { communityName: "Metro Bey League", province: "Metro Manila", startedAt: "2025-11-02T00:00:00.000Z", endedAt: null },
  { communityName: "Cebu Spin Circuit", province: "Cebu", startedAt: "2025-06-15T00:00:00.000Z", endedAt: "2026-02-01T00:00:00.000Z" },
];

export type NotificationStatus = "active" | "hidden" | "archived";

export interface MockNotification {
  id: string;
  title: string;
  body: string;
  type: "approval" | "reminder" | "result" | "system";
  createdAt: string;
  status: NotificationStatus;
}

export const MOCK_NOTIFICATIONS: MockNotification[] = [
  { id: "n1", title: "Registration approved", body: "Your registration for Metro Manila Open X was approved by the organizer.", type: "approval", createdAt: "2026-08-05T09:10:00.000Z", status: "active" },
  { id: "n2", title: "Judge role approved", body: "Congrats — your judge application has been approved.", type: "approval", createdAt: "2026-08-02T14:30:00.000Z", status: "active" },
  { id: "n3", title: "Match starting soon", body: "Your Round 2 match at Cebu Tag Clash 2v2 starts in 30 minutes.", type: "reminder", createdAt: "2026-07-28T13:45:00.000Z", status: "active" },
  { id: "n4", title: "Match result posted", body: "You won your Semifinal match at Laguna Regional Finals via Extreme Finish.", type: "result", createdAt: "2026-07-24T14:25:00.000Z", status: "active" },
  { id: "n5", title: "New achievement unlocked", body: "You unlocked the \"Tournament Champion\" achievement.", type: "system", createdAt: "2026-07-24T15:00:00.000Z", status: "active" },
  { id: "n6", title: "Community application approved", body: "Your application to join Metro Bey League was approved.", type: "approval", createdAt: "2025-11-02T10:00:00.000Z", status: "archived" },
];

export interface AchievementDef {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  achieved: boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first-match", label: "First Match", description: "Play your first official match.", icon: Flag, color: "#60a5fa", achieved: true },
  { id: "rising-star", label: "Rising Star", description: "Win 5 matches.", icon: Sparkles, color: "#facc15", achieved: true },
  { id: "veteran", label: "Veteran", description: "Play in 25 tournaments.", icon: ShieldCheck, color: "#b45309", achieved: true },
  { id: "extreme-god", label: "Extreme God", description: "Land 10 Extreme Finishes.", icon: Flame, color: "#d946ef", achieved: false },
  { id: "burst-king", label: "Burst King", description: "Land 10 Burst Finishes.", icon: Bomb, color: "#f97316", achieved: true },
  { id: "pocket-master", label: "Pocket Master", description: "Land 10 Over Finishes.", icon: Rocket, color: "#22d3ee", achieved: false },
  { id: "all-spin", label: "All Spin", description: "Land 10 Spin Finishes.", icon: RotateCw, color: "#6366f1", achieved: true },
  { id: "swiss-king", label: "Swiss King", description: "Win a Swiss-format tournament.", icon: Layers, color: "#14b8a6", achieved: false },
  { id: "finalist", label: "Finalist", description: "Reach a tournament final.", icon: Award, color: "#94a3b8", achieved: true },
  { id: "top-4", label: "Top 4", description: "Finish top 4 in a tournament.", icon: Users, color: "#f59e0b", achieved: true },
  { id: "top-8", label: "Top 8", description: "Finish top 8 in a tournament.", icon: ListOrdered, color: "#84cc16", achieved: false },
  { id: "bird-king", label: "Bird King", description: "Win with an Attack-type blade.", icon: Feather, color: "#38bdf8", achieved: false },
  { id: "casual-champion", label: "Casual Champion", description: "Win a casual tournament.", icon: PartyPopper, color: "#4ade80", achieved: true },
  { id: "tournament-champion", label: "Tournament Champion", description: "Win a major tournament.", icon: Trophy, color: "#d4af37", achieved: true },
  { id: "grand-champion", label: "Grand Champion", description: "Win a national-level tournament.", icon: Crown, color: "#ed0d11", achieved: false },
  { id: "team-champion", label: "Team Champion", description: "Win a team-format tournament.", icon: Swords, color: "#818cf8", achieved: false },
  { id: "most-likes", label: "Most Likes", description: "Receive 100+ profile likes.", icon: Heart, color: "#f472b6", achieved: true },
];
