import Link from "next/link";
import { Eye, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
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
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead>
          <tr className="label-mono border-b border-outline-variant/25 text-on-surface/40">
            <th className="p-4" scope="col">
              Title
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
              Participants
            </th>
            <th className="p-4" scope="col">
              Date Time
            </th>
            <th className="p-4" scope="col">
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {tournaments.map((t) => (
            <tr key={t.id} className="border-b border-outline-variant/15 last:border-0 hover:bg-white/[0.02]">
              <td className="p-4 font-medium text-on-surface">
                <Link href={`/tournaments/${t.slug}`} className="hover:text-primary hover:underline">
                  {t.title}
                </Link>
              </td>
              <td className="p-4 text-on-surface/60">{t.communityName ?? "—"}</td>
              <td className="p-4 text-primary">{t.championName ?? "—"}</td>
              <td className="p-4 text-on-surface/60">
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  {formatCompactNumber(t.viewCount)}
                </span>
              </td>
              <td className="p-4 text-on-surface/60">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.participants.length}
                </span>
              </td>
              <td className="p-4 text-on-surface/60">
                {formatDate(t.startsAt)} &middot; {formatTime(t.startsAt)}
              </td>
              <td className="p-4">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" tooltip="Preview this tournament without leaving the list" onClick={() => onOpenDetails(t.id)}>
                    Quick Look
                  </Button>
                  <Button asChild size="sm" tooltip="Open the full tournament page">
                    <Link href={`/tournaments/${t.slug}`}>Full Details</Link>
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
