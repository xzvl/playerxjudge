"use client";

import { useState } from "react";
import { ScrollText } from "lucide-react";

import { Pagination } from "@/components/ui/pagination";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { formatDate, formatTime } from "@/lib/format";
import type { WorkspaceLogEntry } from "@/lib/mock/tournament-workspace";

const PAGE_SIZE = 30;

export function TournamentLogPanel({ log }: { log: WorkspaceLogEntry[] }) {
  const [page, setPage] = useState(1);

  if (log.length === 0) {
    return (
      <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
        Nothing has happened yet.
      </p>
    );
  }

  // Entries arrive newest-first (see log/page.tsx's own `order`) — page 1 is
  // always the most recent 30, same "current / last" framing regardless of
  // how the log keeps growing underneath.
  const lastPage = Math.max(1, Math.ceil(log.length / PAGE_SIZE));
  const currentPage = Math.min(page, lastPage);
  const pageEntries = log.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div>
      <div className="mb-6">
        <Pagination page={currentPage} lastPage={lastPage} onChange={setPage} />
      </div>

      <Timeline>
        {pageEntries.map((entry) => (
          <TimelineItem key={entry.id} icon={ScrollText} caption={`${formatDate(entry.at)} · ${formatTime(entry.at)}`}>
            <span className="font-medium text-on-surface">{entry.actor}</span> {entry.action}
          </TimelineItem>
        ))}
      </Timeline>

      <div className="mt-6">
        <Pagination page={currentPage} lastPage={lastPage} onChange={setPage} />
      </div>
    </div>
  );
}
