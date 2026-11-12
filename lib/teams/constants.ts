import type { BattleOutcome, FinishType, TeamRole } from "@/lib/types/database";

export const TEAM_ROLE_LABEL: Record<TeamRole, string> = {
  captain: "Team Captain",
  sub_captain: "Sub Captain",
  member: "Member",
  filler: "Filler",
};

// Display/sort order: leadership first.
export const TEAM_ROLE_ORDER: TeamRole[] = ["captain", "sub_captain", "member", "filler"];

// Roles a manager can hand out directly. Captain moves only through a
// captaincy transfer (see transferCaptaincy in app/account/team/actions.ts).
export const ASSIGNABLE_TEAM_ROLES: Exclude<TeamRole, "captain">[] = ["sub_captain", "member", "filler"];

export const BATTLE_FINISHES: FinishType[] = ["spin", "burst", "over", "extreme"];

export const BATTLE_FINISH_LABEL: Record<FinishType, string> = {
  spin: "Spin Finish",
  burst: "Burst Finish",
  over: "Over Finish",
  extreme: "Extreme Finish",
};

// Beyblade X scoring, same table the judge console uses
// (components/tournaments/judge/PlayerScorePanel.tsx).
export const BATTLE_FINISH_POINTS: Record<FinishType, number> = { spin: 1, over: 2, burst: 2, extreme: 3 };

export const BATTLE_OUTCOME_LABEL: Record<BattleOutcome, string> = { win: "Win", loss: "Lost" };

export function isTeamManagerRole(role: TeamRole | null | undefined): boolean {
  return role === "captain" || role === "sub_captain";
}
