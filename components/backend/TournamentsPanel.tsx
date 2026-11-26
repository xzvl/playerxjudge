"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";

import { InlineAlert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { PageToolbar } from "@/components/ui/page-toolbar";
import { SearchInput } from "@/components/ui/search-input";
import { adminDeleteTournament, adminUpdateTournamentStatus } from "@/app/backend/tournaments/actions";
import { formatDate } from "@/lib/format";
import type { TournamentStatus } from "@/lib/types/database";

const ALL = "all";

const STATUS_OPTIONS: { value: TournamentStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "registration_open", label: "Registration Open" },
  { value: "registration_closed", label: "Registration Closed" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export interface TournamentItem {
  id: string;
  title: string;
  slug: string;
  organizerName: string;
  status: TournamentStatus;
  startsAt: string;
}

export function TournamentsPanel({ tournaments }: { tournaments: TournamentItem[] }) {
  const [rows, setRows] = useState(tournaments);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [deleting, setDeleting] = useState<TournamentItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== ALL && r.status !== statusFilter) return false;
      if (q && !r.title.toLowerCase().includes(q) && !r.organizerName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, query, statusFilter]);

  function handleStatusChange(row: TournamentItem, status: string) {
    setError(null);
    startTransition(async () => {
      const result = await adminUpdateTournamentStatus(row.id, status as TournamentStatus);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: status as TournamentStatus } : r)));
    });
  }

  function handleDelete() {
    if (!deleting) return;
    setError(null);
    startTransition(async () => {
      const result = await adminDeleteTournament(deleting.id);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== deleting.id));
      setDeleting(null);
    });
  }

  return (
    <div className="space-y-4">
      <PageToolbar
        search={
          <SearchInput
            placeholder="Search by title or organizer"
            aria-label="Search tournaments"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        }
      >
        <div className="w-full sm:w-52">
          <Combobox
            label="Status"
            hideLabel
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={[{ value: ALL, label: "All Statuses" }, ...STATUS_OPTIONS]}
          />
        </div>
      </PageToolbar>

      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

      <DataTable
        caption="Tournaments"
        rows={filtered}
        rowKey={(t) => t.id}
        minWidth={820}
        empty={{ title: "No tournaments found", description: "Try a different search or status filter." }}
        columns={[
          {
            key: "title",
            header: "Tournament",
            className: "font-medium text-on-surface",
            cell: (t) => (
              <Link href={`/backend/tournaments/${t.slug}`} className="hover:text-primary hover:underline">
                {t.title}
              </Link>
            ),
          },
          { key: "organizer", header: "Organizer", className: "text-on-surface/60", cell: (t) => t.organizerName },
          { key: "starts", header: "Starts", className: "text-on-surface/60", cell: (t) => formatDate(t.startsAt) },
          {
            key: "status",
            header: "Status",
            cell: (t) => (
              <div className="w-full max-w-[180px]">
                <Combobox label="Status" hideLabel value={t.status} onValueChange={(v) => handleStatusChange(t, v)} options={STATUS_OPTIONS} />
              </div>
            ),
          },
          {
            key: "actions",
            actions: true,
            cell: (t) => (
              <Button variant="ghost" size="icon" tooltip="Delete this tournament" aria-label={`Delete ${t.title}`} disabled={pending} onClick={() => setDeleting(t)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            ),
          },
        ]}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.title ?? "tournament"}?`}
        description="This permanently deletes the tournament and everything tied to it — roster, matches, brackets."
        confirmLabel="Delete Tournament"
        pendingLabel="Deleting…"
        pending={pending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
