import { FINISH_TYPE_LABELS, type PlayerStats } from "@/lib/player/stats";
import type { FinishType } from "@/lib/types/database";

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between border-b border-outline-variant/15 py-3 last:border-0">
      <dt className="text-sm text-on-surface/60">{label}</dt>
      <dd className="font-mono text-sm font-bold text-on-surface">{value}</dd>
    </div>
  );
}

function perMatch(count: number, totalMatches: number) {
  return totalMatches > 0 ? (count / totalMatches).toFixed(2) : "0.00";
}

export function StatisticsPanel({
  fullBodyPhotoUrl,
  stats,
}: {
  fullBodyPhotoUrl: string | null;
  stats: PlayerStats;
}) {
  const { totalWins, totalLosses, totalDraws, totalMatches, finishCounts, totalTeamBattles } = stats;
  const winningPercentage = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;
  const finishTypes = Object.keys(FINISH_TYPE_LABELS) as FinishType[];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,280px)_1fr]">
      <div className="flex h-[420px] items-center justify-center overflow-hidden border border-outline-variant/25 bg-surface-container-low">
        {fullBodyPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fullBodyPhotoUrl} alt="Full body photo" className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm text-on-surface/30">No photo uploaded</span>
        )}
      </div>

      <div className="border border-outline-variant/25 bg-surface-container-low p-6">
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="label-mono text-on-surface/40">Winning Percentage</p>
            <p className="font-mono text-lg font-bold text-primary">{winningPercentage}%</p>
          </div>
          <div className="h-2 w-full bg-surface-container-high">
            <div className="h-2 bg-primary transition-all" style={{ width: `${winningPercentage}%` }} />
          </div>
        </div>

        <dl>
          <StatRow label="Total Win" value={totalWins} />
          <StatRow label="Total Lost" value={totalLosses} />
          <StatRow label="Total Draw" value={totalDraws} />
          <StatRow label="Total Matches" value={totalMatches} />
          {finishTypes.map((ft) => (
            <StatRow
              key={ft}
              label={`Total ${FINISH_TYPE_LABELS[ft]}es`}
              value={finishCounts[ft]}
            />
          ))}
          {finishTypes.map((ft) => (
            <StatRow
              key={`${ft}-rate`}
              label={`${FINISH_TYPE_LABELS[ft]}es per Match`}
              value={perMatch(finishCounts[ft], totalMatches)}
            />
          ))}
          <StatRow label="Total Team Battle" value={totalTeamBattles} />
        </dl>
      </div>
    </div>
  );
}
