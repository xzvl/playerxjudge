import { Eye } from "lucide-react";

import { formatCompactNumber } from "@/lib/format";
import { MOCK_ORGANIZED_TOURNAMENTS } from "@/lib/mock/organizer-dashboard";

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-outline-variant/25 bg-surface-container-low p-5">
      <p className="label-mono text-on-surface/40">{label}</p>
      <p className="mt-2 font-mono text-2xl font-bold text-primary">{value}</p>
    </div>
  );
}

export function AnalyticsPanel() {
  const totalTournaments = MOCK_ORGANIZED_TOURNAMENTS.length;
  const totalParticipants = MOCK_ORGANIZED_TOURNAMENTS.reduce((sum, t) => sum + t.participantCount, 0);
  const totalViews = MOCK_ORGANIZED_TOURNAMENTS.reduce((sum, t) => sum + t.viewCount, 0);
  const avgParticipants = totalTournaments > 0 ? Math.round(totalParticipants / totalTournaments) : 0;

  const byViews = [...MOCK_ORGANIZED_TOURNAMENTS].sort((a, b) => b.viewCount - a.viewCount);

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total Tournaments" value={totalTournaments} />
        <StatTile label="Total Participants" value={totalParticipants} />
        <StatTile label="Total Views" value={formatCompactNumber(totalViews)} />
        <StatTile label="Avg Participants / Tournament" value={avgParticipants} />
      </div>

      <div className="mt-8 overflow-x-auto border border-outline-variant/25">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="label-mono border-b border-outline-variant/25 text-on-surface/40">
              <th className="p-4" scope="col">Tournament</th>
              <th className="p-4" scope="col">Participants</th>
              <th className="p-4" scope="col">Views</th>
            </tr>
          </thead>
          <tbody>
            {byViews.map((t) => (
              <tr key={t.id} className="border-b border-outline-variant/15 last:border-0 hover:bg-white/[0.02]">
                <td className="p-4 font-medium text-on-surface">{t.title}</td>
                <td className="p-4 text-on-surface/60">
                  {t.participantCount}/{t.maxParticipants}
                </td>
                <td className="p-4 text-on-surface/60">
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    {formatCompactNumber(t.viewCount)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
