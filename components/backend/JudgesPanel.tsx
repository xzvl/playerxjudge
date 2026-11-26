"use client";

import { useMemo, useState, useTransition } from "react";
import { Ban, Check, Trash2 } from "lucide-react";

import { InlineAlert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { PageToolbar } from "@/components/ui/page-toolbar";
import { SearchInput } from "@/components/ui/search-input";
import { BeyzIdStatusBadge, CertifiedJudgeBadge } from "@/components/dashboard/judge/badges";
import { approveBeyzId, declineBeyzId, removeJudgeRole } from "@/app/backend/judges/actions";
import type { BeyzIdStatus } from "@/lib/types/database";

export interface JudgeRow {
  roleRowId: string;
  profileId: string;
  displayName: string;
  username: string;
  beyzIdUrl: string | null;
  beyzIdStatus: BeyzIdStatus | null;
}

export function JudgesPanel({ judges }: { judges: JudgeRow[] }) {
  const [rows, setRows] = useState(judges);
  const [query, setQuery] = useState("");
  const [removing, setRemoving] = useState<JudgeRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.displayName.toLowerCase().includes(q) || r.username.toLowerCase().includes(q));
  }, [rows, query]);

  function decide(row: JudgeRow, action: (id: string) => Promise<{ status: string; message?: string }>, next: BeyzIdStatus) {
    setError(null);
    startTransition(async () => {
      const result = await action(row.profileId);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setRows((prev) => prev.map((r) => (r.roleRowId === row.roleRowId ? { ...r, beyzIdStatus: next } : r)));
    });
  }

  function handleRemove() {
    if (!removing) return;
    setError(null);
    startTransition(async () => {
      const result = await removeJudgeRole(removing.roleRowId);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setRows((prev) => prev.filter((r) => r.roleRowId !== removing.roleRowId));
      setRemoving(null);
    });
  }

  return (
    <div className="space-y-4">
      <PageToolbar
        search={
          <SearchInput
            placeholder="Search by name or username"
            aria-label="Search judges"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        }
      />

      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

      <DataTable
        caption="Judges"
        rows={filtered}
        rowKey={(r) => r.roleRowId}
        minWidth={760}
        empty={{
          title: judges.length === 0 ? "No approved judges yet" : "No judges found",
          description: judges.length === 0 ? "Approved judge applications appear here." : "Try a different name or username.",
        }}
        columns={[
          {
            key: "judge",
            header: "Judge",
            cell: (r) => (
              <>
                <p className="font-medium text-on-surface">{r.displayName}</p>
                <p className="text-xs text-on-surface/40">@{r.username}</p>
              </>
            ),
          },
          { key: "cert", header: "Certification", cell: (r) => <CertifiedJudgeBadge certified={r.beyzIdStatus === "approved"} /> },
          {
            key: "beyz",
            header: "BeyZ ID",
            cell: (r) => (
              <div className="flex items-center gap-2">
                <BeyzIdStatusBadge status={r.beyzIdStatus} />
                {r.beyzIdUrl ? (
                  <a href={r.beyzIdUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                    View
                  </a>
                ) : null}
              </div>
            ),
          },
          {
            key: "actions",
            actions: true,
            cell: (r) => (
              <div className="flex items-center justify-end gap-1">
                {r.beyzIdStatus === "pending" ? (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      tooltip="Approve BeyZ ID"
                      aria-label={`Approve BeyZ ID for ${r.displayName}`}
                      disabled={pending}
                      onClick={() => decide(r, approveBeyzId, "approved")}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      tooltip="Decline BeyZ ID"
                      aria-label={`Decline BeyZ ID for ${r.displayName}`}
                      disabled={pending}
                      onClick={() => decide(r, declineBeyzId, "declined")}
                    >
                      <Ban className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : null}
                <Button
                  variant="ghost"
                  size="icon"
                  tooltip="Revoke this judge's role"
                  aria-label={`Remove judge ${r.displayName}`}
                  disabled={pending}
                  onClick={() => setRemoving(r)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ),
          },
        ]}
      />

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remove ${removing?.displayName ?? "judge"}?`}
        description="This revokes their judge role. They keep their player account and can re-apply from Become a Judge."
        confirmLabel="Remove Judge"
        pendingLabel="Removing…"
        pending={pending}
        onConfirm={handleRemove}
      />
    </div>
  );
}
