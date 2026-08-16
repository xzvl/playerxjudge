"use client";

import { useMemo, useState, useTransition } from "react";
import { Ban, Check, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
    <div>
      <Input
        className="mb-6 w-full max-w-xs"
        placeholder="Search by name or username..."
        aria-label="Search judges"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {error ? (
        <p role="alert" className="mb-4 border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {filtered.length > 0 ? (
        <div className="overflow-x-auto border border-outline-variant/25">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="label-mono border-b border-outline-variant/25 text-on-surface/40">
                <th className="p-4" scope="col">Judge</th>
                <th className="p-4" scope="col">Certification</th>
                <th className="p-4" scope="col">BeyZ ID</th>
                <th className="p-4" scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.roleRowId} className="border-b border-outline-variant/15 last:border-0 hover:bg-white/[0.02]">
                  <td className="p-4">
                    <p className="font-medium text-on-surface">{r.displayName}</p>
                    <p className="text-xs text-on-surface/40">@{r.username}</p>
                  </td>
                  <td className="p-4">
                    <CertifiedJudgeBadge certified={r.beyzIdStatus === "approved"} />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <BeyzIdStatusBadge status={r.beyzIdStatus} />
                      {r.beyzIdUrl ? (
                        <a href={r.beyzIdUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                          View
                        </a>
                      ) : null}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
          {judges.length === 0 ? "No approved judges yet." : "No judges match your search."}
        </p>
      )}

      <Dialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove {removing?.displayName}?</DialogTitle>
            <DialogDescription>
              This revokes their judge role. They keep their player account and can re-apply from Become a Judge.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="p-6 pt-0">
            <Button type="button" variant="destructive" tooltip="Revoke this judge role" disabled={pending} onClick={handleRemove}>
              {pending ? "Removing..." : "Remove Judge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
