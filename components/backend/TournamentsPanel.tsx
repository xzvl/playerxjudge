"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Input
          className="w-full max-w-xs"
          placeholder="Search by title or organizer..."
          aria-label="Search tournaments"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="w-full max-w-xs">
          <Combobox
            label="Status"
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={[{ value: ALL, label: "All Statuses" }, ...STATUS_OPTIONS]}
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="mb-4 border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {filtered.length > 0 ? (
        <div className="overflow-x-auto border border-outline-variant/25">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="label-mono border-b border-outline-variant/25 text-on-surface/40">
                <th className="p-4" scope="col">Tournament</th>
                <th className="p-4" scope="col">Organizer</th>
                <th className="p-4" scope="col">Starts</th>
                <th className="p-4" scope="col">Status</th>
                <th className="p-4" scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-outline-variant/15 last:border-0 hover:bg-white/[0.02]">
                  <td className="p-4 font-medium text-on-surface">
                    <Link href={`/backend/tournaments/${t.slug}`} className="hover:text-primary hover:underline">
                      {t.title}
                    </Link>
                  </td>
                  <td className="p-4 text-on-surface/60">{t.organizerName}</td>
                  <td className="p-4 text-on-surface/60">{formatDate(t.startsAt)}</td>
                  <td className="p-4">
                    <div className="max-w-[180px]">
                      <Combobox label="Status" hideLabel value={t.status} onValueChange={(v) => handleStatusChange(t, v)} options={STATUS_OPTIONS} />
                    </div>
                  </td>
                  <td className="p-4">
                    <Button variant="ghost" size="icon" tooltip="Delete this tournament" aria-label={`Delete ${t.title}`} disabled={pending} onClick={() => setDeleting(t)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
          No tournaments match your filters.
        </p>
      )}

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {deleting?.title}?</DialogTitle>
            <DialogDescription>This permanently deletes the tournament and everything tied to it — roster, matches, brackets.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="p-6 pt-0">
            <Button type="button" variant="destructive" tooltip="Permanently delete this tournament" disabled={pending} onClick={handleDelete}>
              {pending ? "Deleting..." : "Delete Tournament"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
