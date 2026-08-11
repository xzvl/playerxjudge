"use client";

import { useState } from "react";
import { Flag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportStatusBadge } from "@/components/dashboard/organizer/badges";
import { formatDate } from "@/lib/format";
import { MOCK_REPORTS, type MockReport, type ReportStatus } from "@/lib/mock/organizer-dashboard";

export function ReportsPanel() {
  const [reports, setReports] = useState<MockReport[]>(MOCK_REPORTS);
  const [view, setView] = useState<"open" | "closed">("open");

  function setStatus(id: string, status: ReportStatus) {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  const visible = reports.filter((r) => (view === "open" ? r.status === "open" : r.status !== "open"));

  return (
    <div>
      <Tabs value={view} onValueChange={(v) => setView(v as "open" | "closed")} className="mb-6">
        <TabsList>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="closed">Resolved &amp; Dismissed</TabsTrigger>
        </TabsList>
      </Tabs>

      {visible.length > 0 ? (
        <ul className="space-y-3">
          {visible.map((r) => (
            <li key={r.id} className="flex items-start gap-4 border border-outline-variant/25 bg-surface-container-low p-4">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border border-outline-variant/40 text-primary">
                <Flag className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-on-surface">{r.targetLabel}</p>
                  <ReportStatusBadge status={r.status} />
                </div>
                <p className="mt-1 text-sm text-on-surface/60">{r.reason}</p>
                <p className="label-mono mt-2 text-on-surface/30">
                  Reported by {r.reporterName} &middot; {formatDate(r.createdAt)}
                </p>
              </div>
              {r.status === "open" ? (
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" tooltip="Mark this report resolved" onClick={() => setStatus(r.id, "resolved")}>
                    Resolve
                  </Button>
                  <Button variant="outline" size="sm" tooltip="Dismiss this report" onClick={() => setStatus(r.id, "dismissed")}>
                    Dismiss
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  tooltip="Reopen this report"
                  onClick={() => setStatus(r.id, "open")}
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
