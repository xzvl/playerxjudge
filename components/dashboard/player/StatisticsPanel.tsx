import { FINISH_TYPE_LABELS, PLAYER_STATS, type FinishType } from "@/lib/mock/player-dashboard";

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between border-b border-outline-variant/15 py-3 last:border-0">
      <dt className="text-sm text-on-surface/60">{label}</dt>
      <dd className="font-mono text-sm font-medium text-on-surface">{value}</dd>
    </div>
  );
}

function perMatch(count: number, totalMatches: number) {
  return totalMatches > 0 ? (count / totalMatches).toFixed(2) : "0.00";
}

export function StatisticsPanel({ fullBodyPhotoUrl }: { fullBodyPhotoUrl: string | null }) {
  const { totalWins, totalLosses, totalMatches, finishCounts, totalTeamBattles, totalLikes } = PLAYER_STATS;
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
          <StatRow label="Total Likes" value={totalLikes} />
        </dl>
      </div>
    </div>
  );
}
