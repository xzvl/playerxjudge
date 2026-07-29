import { Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TournamentThumbnail } from "@/components/tournaments/TournamentThumbnail";
import { formatCompactNumber, formatDate, formatTime } from "@/lib/format";
import type { MockTournament } from "@/lib/mock/tournaments";

export function TournamentTable({
  tournaments,
  onOpenDetails,
}: {
  tournaments: MockTournament[];
  onOpenDetails: (id: string) => void;
}) {
  if (tournaments.length === 0) {
    return (
      <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
        No recent tournaments match your filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto border border-outline-variant/25">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="label-mono border-b border-outline-variant/25 text-on-surface/40">
            <th className="p-4" scope="col">
              <span className="sr-only">Thumbnail</span>
            </th>
            <th className="p-4" scope="col">
              Title
            </th>
            <th className="p-4" scope="col">
              Date
            </th>
            <th className="p-4" scope="col">
              Time
            </th>
            <th className="p-4" scope="col">
              Community
            </th>
            <th className="p-4" scope="col">
              Champion
            </th>
            <th className="p-4" scope="col">
              Views
            </th>
            <th className="p-4" scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {tournaments.map((t) => (
            <tr key={t.id} className="border-b border-outline-variant/15 last:border-0 hover:bg-white/[0.02]">
              <td className="p-4">
                <TournamentThumbnail color={t.thumbnailColor} title={t.title} className="h-12 w-16" />
              </td>
              <td className="p-4 font-medium text-on-surface">{t.title}</td>
              <td className="p-4 text-on-surface/60">{formatDate(t.startsAt)}</td>
              <td className="p-4 text-on-surface/60">{formatTime(t.startsAt)}</td>
              <td className="p-4 text-on-surface/60">{t.communityName ?? "—"}</td>
              <td className="p-4 text-primary">{t.championName ?? "—"}</td>
              <td className="p-4 text-on-surface/60">
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  {formatCompactNumber(t.viewCount)}
                </span>
              </td>
              <td className="p-4">
                <Button variant="outline" size="sm" onClick={() => onOpenDetails(t.id)}>
                  Full Details
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
