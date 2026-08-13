import { ScrollText } from "lucide-react";

import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { formatDate, formatTime } from "@/lib/format";
import type { WorkspaceLogEntry } from "@/lib/mock/tournament-workspace";

export function TournamentLogPanel({ log }: { log: WorkspaceLogEntry[] }) {
  if (log.length === 0) {
    return (
      <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
        Nothing has happened yet.
      </p>
    );
  }

  return (
    <Timeline>
      {log.map((entry) => (
        <TimelineItem key={entry.id} icon={ScrollText} caption={`${formatDate(entry.at)} · ${formatTime(entry.at)}`}>
          <span className="font-medium text-on-surface">{entry.actor}</span> {entry.action}
        </TimelineItem>
      ))}
    </Timeline>
  );
}
