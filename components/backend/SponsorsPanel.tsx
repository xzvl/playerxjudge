"use client";

import { useMemo, useState, useTransition } from "react";
import { Ban, Check, Pencil, Trash2 } from "lucide-react";

import { InlineAlert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PageToolbar } from "@/components/ui/page-toolbar";
import { SearchInput } from "@/components/ui/search-input";
import { SponsorApprovalStatusBadge, SponsorStatusBadge } from "@/components/dashboard/sponsor/badges";
import { adminDeleteSponsor, adminUpdateSponsor, approveSponsorListing, declineSponsorListing, type AdminSponsorEdit } from "@/app/backend/sponsors/actions";
import { DONATION_TIERS, tierLabel } from "@/lib/sponsors/status";
import { formatDate } from "@/lib/format";
import type { Sponsor, SponsorDonationTier } from "@/lib/types/database";

export interface SponsorItem {
  id: string;
  companyName: string;
  websiteUrl: string | null;
  facebookUrl: string | null;
  donationTier: SponsorDonationTier | null;
  tierExpiresAt: string | null;
  approvalStatus: Sponsor["approval_status"];
  ownerName: string;
}

function toEditState(item: SponsorItem): AdminSponsorEdit {
  return {
    companyName: item.companyName,
    websiteUrl: item.websiteUrl ?? "",
    facebookUrl: item.facebookUrl ?? "",
    donationTier: item.donationTier ?? "",
    tierExpiresAt: item.tierExpiresAt ?? "",
  };
}

function EditDialog({
  item,
  onOpenChange,
  pending,
  onSave,
}: {
  item: SponsorItem | null;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onSave: (input: AdminSponsorEdit) => void;
}) {
  const [form, setForm] = useState<AdminSponsorEdit | null>(item ? toEditState(item) : null);

  if (!item) return null;
  const values = form ?? toEditState(item);

  return (
    <Dialog
      open={item !== null}
      onOpenChange={(open) => {
        if (!open) setForm(null);
        onOpenChange(open);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {item.companyName}</DialogTitle>
          <DialogDescription>Updates this sponsor listing directly.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-5 pb-1">
          <FormField label="Sponsor Name" required>
            <Input value={values.companyName} onChange={(e) => setForm({ ...values, companyName: e.target.value })} />
          </FormField>
          <FormField label="Website URL">
            <Input type="url" value={values.websiteUrl} onChange={(e) => setForm({ ...values, websiteUrl: e.target.value })} />
          </FormField>
          <FormField label="Facebook URL">
            <Input type="url" value={values.facebookUrl} onChange={(e) => setForm({ ...values, facebookUrl: e.target.value })} />
          </FormField>
          <FormField label="Donation Tier">
            <Combobox
              label="Tier"
              hideLabel
              placeholder="No tier"
              value={values.donationTier}
              onValueChange={(v) => setForm({ ...values, donationTier: v as SponsorDonationTier })}
              options={DONATION_TIERS.map((t) => ({ value: t.value, label: `${t.duration} (${t.price})` }))}
            />
          </FormField>
          <FormField label="Tier Expires" hint="Leave empty for no expiry.">
            <Input type="date" value={values.tierExpiresAt} onChange={(e) => setForm({ ...values, tierExpiresAt: e.target.value })} />
          </FormField>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={pending} aria-busy={pending} onClick={() => onSave(values)}>
            {pending ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SponsorsPanel({ sponsors }: { sponsors: SponsorItem[] }) {
  const [rows, setRows] = useState(sponsors);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<SponsorItem | null>(null);
  const [deleting, setDeleting] = useState<SponsorItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.companyName.toLowerCase().includes(q) || r.ownerName.toLowerCase().includes(q));
  }, [rows, query]);

  function handleApprove(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await approveSponsorListing(id);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, approvalStatus: "approved" } : r)));
    });
  }

  function handleDecline(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await declineSponsorListing(id);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, approvalStatus: "declined" } : r)));
    });
  }

  function handleSave(input: AdminSponsorEdit) {
    if (!editing) return;
    setError(null);
    startTransition(async () => {
      const result = await adminUpdateSponsor(editing.id, input);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setRows((prev) =>
        prev.map((r) =>
          r.id === editing.id
            ? {
                ...r,
                companyName: input.companyName,
                websiteUrl: input.websiteUrl || null,
                facebookUrl: input.facebookUrl || null,
                donationTier: input.donationTier || null,
                tierExpiresAt: input.tierExpiresAt || null,
              }
            : r
        )
      );
      setEditing(null);
    });
  }

  function handleDelete() {
    if (!deleting) return;
    setError(null);
    startTransition(async () => {
      const result = await adminDeleteSponsor(deleting.id);
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
            placeholder="Search by sponsor or account"
            aria-label="Search sponsors"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        }
      />

      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

      <DataTable
        caption="Sponsor listings"
        rows={filtered}
        rowKey={(s) => s.id}
        minWidth={900}
        empty={{
          title: sponsors.length === 0 ? "No sponsor listings yet" : "No sponsors found",
          description: sponsors.length === 0 ? "Listings submitted by sponsors appear here." : "Try a different sponsor or account name.",
        }}
        columns={[
          { key: "name", header: "Sponsor", className: "font-medium text-on-surface", cell: (s) => s.companyName },
          { key: "owner", header: "Account", className: "text-on-surface/60", cell: (s) => s.ownerName },
          { key: "tier", header: "Tier", className: "text-on-surface/60", cell: (s) => tierLabel(s.donationTier) },
          { key: "expires", header: "Expires", className: "text-on-surface/60", cell: (s) => (s.tierExpiresAt ? formatDate(s.tierExpiresAt) : "—") },
          {
            key: "status",
            header: "Status",
            cell: (s) => (
              <div className="flex flex-wrap gap-1">
                <SponsorStatusBadge sponsor={{ approval_status: s.approvalStatus, tier_expires_at: s.tierExpiresAt }} />
                <SponsorApprovalStatusBadge status={s.approvalStatus} />
              </div>
            ),
          },
          {
            key: "actions",
            actions: true,
            cell: (s) => (
              <div className="flex items-center justify-end gap-1">
                {s.approvalStatus === "pending" ? (
                  <>
                    <Button variant="ghost" size="icon" tooltip="Approve this listing" aria-label={`Approve ${s.companyName}`} disabled={pending} onClick={() => handleApprove(s.id)}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" tooltip="Decline this listing" aria-label={`Decline ${s.companyName}`} disabled={pending} onClick={() => handleDecline(s.id)}>
                      <Ban className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : null}
                <Button variant="ghost" size="icon" tooltip="Edit this listing" aria-label={`Edit ${s.companyName}`} disabled={pending} onClick={() => setEditing(s)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" tooltip="Delete this listing" aria-label={`Delete ${s.companyName}`} disabled={pending} onClick={() => setDeleting(s)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ),
          },
        ]}
      />

      <EditDialog item={editing} onOpenChange={(open) => !open && setEditing(null)} pending={pending} onSave={handleSave} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.companyName ?? "listing"}?`}
        description="This permanently deletes this sponsor listing and its logo."
        confirmLabel="Delete Listing"
        pendingLabel="Deleting…"
        pending={pending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
