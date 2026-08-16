import Link from "next/link";
import { Eye, Users } from "lucide-react";

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
    <>
      {/* Below lg: one row per tournament (thumbnail + stacked details) —
          the table's columns don't fit a phone/tablet width without
          horizontal scrolling, so it swaps for a card list instead. */}
      <div className="flex flex-col gap-3 lg:hidden">
        {tournaments.map((t) => (
          <article key={t.id} className="flex gap-3 border border-outline-variant/25 bg-surface-container-low p-3">
            <TournamentThumbnail
              color={t.thumbnailColor}
              title={t.title}
              imageUrl={t.thumbnailUrl}
              className="h-16 w-16 shrink-0"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Link
                href={`/tournaments/${t.slug}`}
                className="font-inter font-bold text-[13px] text-[#e2e2e2] leading-tight truncate block hover:text-primary hover:underline underline-offset-2 transition-colors"
              >
                {t.title}
              </Link>
              <p className="line-clamp-1 text-xs text-on-surface/60">
                {t.communityName ?? "Individual"} <span className="text-on-surface/30">|</span> Champ:{" "}
                <span className="text-primary">{t.championName ?? "—"}</span>
              </p>
              <p className="flex items-center gap-1 text-xs text-on-surface/50">
                <Eye className="h-3 w-3 shrink-0" aria-hidden="true" /> Views: <span className="text-[#e2e2e2]">{formatCompactNumber(t.viewCount)}{" "}</span>
                <span className="text-on-surface/30">|</span> <Users className="h-3 w-3 shrink-0" aria-hidden="true" />{" "}
                Participants: <span className="text-[#e2e2e2]">{t.participants.length}</span>
              </p>
              <p className="text-xs text-on-surface/50">
                Date and Time: <span className="text-primary">{formatDate(t.startsAt)} &middot; {formatTime(t.startsAt)}</span>
              </p>
              <div className="mt-1 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-[9px] px-3 py-2"
                  tooltip="Preview this tournament without leaving the list"
                  onClick={() => onOpenDetails(t.id)}
                >
                  Quick Look
                </Button>
                <Button asChild size="sm" className="flex-1 text-[9px] px-3 py-2" tooltip="Open the full tournament page">
                  <Link href={`/tournaments/${t.slug}`}>Full Details</Link>
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* lg and up: the full table. */}
      <div className="hidden overflow-x-auto border border-outline-variant/25 lg:block">
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
    </>
  );
}
