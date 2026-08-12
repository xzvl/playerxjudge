import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FINISH_LABEL, totalFinishes, type FinishCounts } from "@/lib/player-view-stats";
import type { FinishType } from "@/lib/types/database";

function initials(name: string) {
  const parts = name.replace(/^Team\s+/i, "").trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function StatBar({ label, value, percent }: { label: string; value: number; percent: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="label-mono text-on-surface/50">{label}</p>
        <p className="font-mono text-sm font-semibold text-on-surface">{value}</p>
      </div>
      <div className="h-1.5 w-full bg-surface-container-high">
        <div className="h-1.5 bg-primary transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

const FINISH_ORDER: FinishType[] = ["spin", "over", "burst", "extreme"];

export function PlayerStatsSidebar({
  playerName,
  finishCounts,
  matchesPlayed,
  matchesSeated,
}: {
  playerName: string;
  finishCounts: FinishCounts;
  matchesPlayed: number;
  matchesSeated: number;
}) {
  const total = totalFinishes(finishCounts);

  return (
    <div className="space-y-6">
      <div className="flex aspect-square w-full items-center justify-center overflow-hidden border border-outline-variant/25 bg-surface-container-low">
        <Avatar className="h-24 w-24">
          <AvatarFallback className="text-2xl">{initials(playerName)}</AvatarFallback>
        </Avatar>
      </div>

      <div id="statistics" className="scroll-mt-20 space-y-5 border border-outline-variant/25 bg-surface-container-low p-4">
        <p className="label-mono text-on-surface/40">Player Statistics</p>

        {FINISH_ORDER.map((type) => (
          <StatBar
            key={type}
            label={`${FINISH_LABEL[type]} Finishes`}
            value={finishCounts[type]}
            percent={total > 0 ? (finishCounts[type] / total) * 100 : 0}
          />
        ))}

        <StatBar label="Penalty Points" value={0} percent={0} />
        <StatBar
          label="Total Matches"
          value={matchesPlayed}
          percent={matchesSeated > 0 ? (matchesPlayed / matchesSeated) * 100 : 0}
        />
      </div>
    </div>
  );
}
