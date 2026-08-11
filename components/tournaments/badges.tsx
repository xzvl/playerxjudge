import { Badge } from "@/components/ui/badge";
import type { BattleType, TournamentType } from "@/lib/types/database";

const BATTLE_TYPE_LABELS: Record<BattleType, string> = {
  solo: "Solo",
  "2v2": "2v2",
  "3v3": "3v3",
  "4v4": "4v4",
  "5v5": "5v5",
  team_battle: "Team Battle",
};

const TOURNAMENT_TYPE_VARIANTS: Record<TournamentType, "casual" | "minor" | "major" | "emergency" | "league"> = {
  casual: "casual",
  minor: "minor",
  major: "major",
  emergency: "emergency",
  league: "league",
};

export function BattleTypeBadge({ type }: { type: BattleType }) {
  return <Badge variant="secondary">{BATTLE_TYPE_LABELS[type]}</Badge>;
}

export function TournamentTypeBadge({ type }: { type: TournamentType }) {
  return <Badge variant={TOURNAMENT_TYPE_VARIANTS[type]}>{type}</Badge>;
}
