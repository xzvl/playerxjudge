"use client";

import { useMemo, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { InlineAlert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { PageToolbar } from "@/components/ui/page-toolbar";
import { SearchInput } from "@/components/ui/search-input";
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
    <div className="space-y-4">
      <PageToolbar
        search={
          <SearchInput
            placeholder="Search by name or username"
            aria-label="Search organizers"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        }
      />

      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

      <DataTable
        caption="Organizers"
        rows={filtered}
        rowKey={(r) => r.roleRowId}
        minWidth={680}
        empty={{
          title: organizers.length === 0 ? "No approved organizers yet" : "No organizers found",
          description: organizers.length === 0 ? "Approved organizer applications appear here." : "Try a different name or username.",
        }}
        columns={[
          {
            key: "organizer",
            header: "Organizer",
            cell: (r) => (
              <>
                <p className="font-medium text-on-surface">{r.displayName}</p>
                <p className="text-xs text-on-surface/40">@{r.username}</p>
              </>
            ),
          },
          {
            key: "tier",
            header: "Tier",
            cell: (r) => (
              <div className="w-full max-w-[160px]">
                <Combobox label="Tier" hideLabel value={r.tier} onValueChange={(v) => handleTierChange(r, v)} options={TIER_OPTIONS} />
              </div>
            ),
          },
          { key: "approved", header: "Approved", className: "text-on-surface/60", cell: (r) => (r.approvedAt ? formatDate(r.approvedAt) : "—") },
          {
            key: "actions",
            actions: true,
            cell: (r) => (
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
            ),
          },
        ]}
      />

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remove ${removing?.displayName ?? "organizer"}?`}
        description="This revokes their organizer role. They keep their player account and can re-apply from Become an Organizer. Communities they already own aren't affected."
        confirmLabel="Remove Organizer"
        pendingLabel="Removing…"
        pending={pending}
        onConfirm={handleRemove}
      />
    </div>
  );
}
