import { ScrollText } from "lucide-react";

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
    <ol className="space-y-0 border-l border-outline-variant/25">
      {log.map((entry) => (
        <li key={entry.id} className="relative py-3 pl-6">
          <span className="absolute left-0 top-4 h-2 w-2 -translate-x-1/2 rounded-full bg-outline-variant/60" aria-hidden="true" />
          <p className="flex items-start gap-2 text-sm text-on-surface/80">
            <ScrollText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-on-surface/30" aria-hidden="true" />
            <span>
              <span className="font-medium text-on-surface">{entry.actor}</span> {entry.action}
            </span>
          </p>
          <p className="label-mono ml-6 mt-1 text-on-surface/30">
            {formatDate(entry.at)} &middot; {formatTime(entry.at)}
          </p>
        </li>
      ))}
    </ol>
  );
}
