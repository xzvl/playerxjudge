"use client";

import { useMemo, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { removeOrganizerRole, updateOrganizerTier } from "@/app/backend/organizers/actions";
import { formatDate } from "@/lib/format";
import type { SubscriptionPlan } from "@/lib/types/database";

export interface OrganizerRow {
  roleRowId: string;
  profileId: string;
  displayName: string;
  username: string;
  tier: SubscriptionPlan;
  approvedAt: string | null;
}

const TIER_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "premium", label: "Premium" },
];

export function OrganizersPanel({ organizers }: { organizers: OrganizerRow[] }) {
  const [rows, setRows] = useState(organizers);
  const [query, setQuery] = useState("");
  const [removing, setRemoving] = useState<OrganizerRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.displayName.toLowerCase().includes(q) || r.username.toLowerCase().includes(q));
  }, [rows, query]);

  function handleTierChange(row: OrganizerRow, tier: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateOrganizerTier(row.profileId, tier as SubscriptionPlan);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setRows((prev) => prev.map((r) => (r.roleRowId === row.roleRowId ? { ...r, tier: tier as SubscriptionPlan } : r)));
    });
  }

  function handleRemove() {
    if (!removing) return;
    setError(null);
    startTransition(async () => {
      const result = await removeOrganizerRole(removing.roleRowId);
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
        aria-label="Search organizers"
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
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="label-mono border-b border-outline-variant/25 text-on-surface/40">
                <th className="p-4" scope="col">Organizer</th>
                <th className="p-4" scope="col">Tier</th>
                <th className="p-4" scope="col">Approved</th>
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
                    <div className="max-w-[160px]">
                      <Combobox
                        label="Tier"
                        hideLabel
                        value={r.tier}
                        onValueChange={(v) => handleTierChange(r, v)}
                        options={TIER_OPTIONS}
                      />
                    </div>
                  </td>
                  <td className="p-4 text-on-surface/60">{r.approvedAt ? formatDate(r.approvedAt) : "—"}</td>
                  <td className="p-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      tooltip="Revoke this organizer's role"
                      aria-label={`Remove organizer ${r.displayName}`}
                      disabled={pending}
                      onClick={() => setRemoving(r)}
                    >
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
          {organizers.length === 0 ? "No approved organizers yet." : "No organizers match your search."}
        </p>
      )}

      <Dialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove {removing?.displayName}?</DialogTitle>
            <DialogDescription>
              This revokes their organizer role. They keep their player account and can re-apply from Become an
              Organizer. Communities they already own aren&apos;t affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="p-6 pt-0">
            <Button type="button" variant="destructive" tooltip="Revoke this organizer role" disabled={pending} onClick={handleRemove}>
              {pending ? "Removing..." : "Remove Organizer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
