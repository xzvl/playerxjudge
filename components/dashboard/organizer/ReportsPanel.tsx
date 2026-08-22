"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportStatusBadge } from "@/components/dashboard/organizer/badges";
import { formatDate } from "@/lib/format";
import { updateReportStatus } from "@/app/account/organizer/tournament/[slug]/workspace-panels-actions";
import type { TournamentReportStatus } from "@/lib/types/database";

export interface OrganizerReportItem {
  id: string;
  tournamentSlug: string;
  tournamentTitle: string;
  reporterName: string;
  targetLabel: string;
  reason: string;
  status: TournamentReportStatus;
  createdAt: string;
}

// Cross-tournament version of TournamentReportsPanel (which this otherwise
// mirrors) — one report can belong to any of the organizer's tournaments, so
// each row carries its own `tournamentSlug` to pass into updateReportStatus
// rather than a single slug prop.
export function ReportsPanel({ reports }: { reports: OrganizerReportItem[] }) {
  const [items, setItems] = useState<OrganizerReportItem[]>(reports);
  const [view, setView] = useState<"open" | "closed">("open");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setStatus(report: OrganizerReportItem, status: TournamentReportStatus) {
    setError(null);
    startTransition(async () => {
      const result = await updateReportStatus(report.id, report.tournamentSlug, status);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setItems((prev) => prev.map((r) => (r.id === report.id ? { ...r, status } : r)));
    });
  }

  const visible = items.filter((r) => (view === "open" ? r.status === "open" : r.status !== "open"));

  return (
    <div>
      <Tabs value={view} onValueChange={(v) => setView(v as "open" | "closed")} className="mb-6">
        <TabsList>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="closed">Resolved &amp; Dismissed</TabsTrigger>
        </TabsList>
      </Tabs>

      {error ? (
        <p role="alert" className="mb-4 border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {visible.length > 0 ? (
        <ul className="space-y-3">
          {visible.map((r) => (
            <li key={r.id} className="flex items-start gap-4 border border-outline-variant/25 bg-surface-container-low p-4">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border border-outline-variant/40 text-primary">
                <Flag className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-on-surface">{r.targetLabel}</p>
                  <ReportStatusBadge status={r.status} />
                </div>
                <p className="mt-1 text-sm text-on-surface/60">{r.reason}</p>
                <p className="label-mono mt-2 text-on-surface/30">
                  {r.tournamentTitle} &middot; Reported by {r.reporterName} &middot; {formatDate(r.createdAt)}
                </p>
              </div>
              {r.status === "open" ? (
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    tooltip="Mark this report resolved"
                    disabled={pending}
                    onClick={() => setStatus(r, "resolved")}
                  >
                    Resolve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    tooltip="Dismiss this report"
                    disabled={pending}
                    onClick={() => setStatus(r, "dismissed")}
                  >
                    Dismiss
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  tooltip="Reopen this report"
                  disabled={pending}
                  onClick={() => setStatus(r, "open")}
                  className="shrink-0"
                >
                  Reopen
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
          {view === "open" ? "No open reports." : "No resolved or dismissed reports yet."}
        </p>
      )}
    </div>
  );
}
