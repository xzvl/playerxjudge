"use client";

import { useMemo, useState, useTransition } from "react";
import { Ban, Check, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
        <div className="space-y-4 px-6 pb-6">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-on-surface">Sponsor Name</label>
            <Input value={values.companyName} onChange={(e) => setForm({ ...values, companyName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-on-surface">Website URL</label>
            <Input value={values.websiteUrl} onChange={(e) => setForm({ ...values, websiteUrl: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-on-surface">Facebook URL</label>
            <Input value={values.facebookUrl} onChange={(e) => setForm({ ...values, facebookUrl: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-on-surface">Donation Tier</label>
            <Combobox
              label="Tier"
              hideLabel
              placeholder="No tier"
              value={values.donationTier}
              onValueChange={(v) => setForm({ ...values, donationTier: v as SponsorDonationTier })}
              options={DONATION_TIERS.map((t) => ({ value: t.value, label: `${t.duration} (${t.price})` }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-on-surface" htmlFor="sponsor-tier-expires">
              Tier Expires
            </label>
            <input
              id="sponsor-tier-expires"
              type="date"
              value={values.tierExpiresAt}
              onChange={(e) => setForm({ ...values, tierExpiresAt: e.target.value })}
              className="h-11 w-full border border-outline-variant/40 bg-surface-container-low px-3 text-sm text-on-surface"
            />
          </div>
        </div>
        <DialogFooter className="p-6 pt-0">
          <Button type="button" tooltip="Save changes" disabled={pending} onClick={() => onSave(values)}>
            {pending ? "Saving..." : "Save Changes"}
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
    <div>
      <Input
        className="mb-6 w-full max-w-xs"
        placeholder="Search by sponsor or account..."
        aria-label="Search sponsors"
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
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="label-mono border-b border-outline-variant/25 text-on-surface/40">
                <th className="p-4" scope="col">Sponsor</th>
                <th className="p-4" scope="col">Account</th>
                <th className="p-4" scope="col">Tier</th>
                <th className="p-4" scope="col">Expires</th>
                <th className="p-4" scope="col">Status</th>
                <th className="p-4" scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-outline-variant/15 last:border-0 hover:bg-white/[0.02]">
                  <td className="p-4 font-medium text-on-surface">{s.companyName}</td>
                  <td className="p-4 text-on-surface/60">{s.ownerName}</td>
                  <td className="p-4 text-on-surface/60">{tierLabel(s.donationTier)}</td>
                  <td className="p-4 text-on-surface/60">{s.tierExpiresAt ? formatDate(s.tierExpiresAt) : "—"}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      <SponsorStatusBadge sponsor={{ approval_status: s.approvalStatus, tier_expires_at: s.tierExpiresAt }} />
                      <SponsorApprovalStatusBadge status={s.approvalStatus} />
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
          {sponsors.length === 0 ? "No sponsor listings yet." : "No sponsors match your search."}
        </p>
      )}

      <EditDialog item={editing} onOpenChange={(open) => !open && setEditing(null)} pending={pending} onSave={handleSave} />

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {deleting?.companyName}?</DialogTitle>
            <DialogDescription>This permanently deletes this sponsor listing and its logo.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="p-6 pt-0">
            <Button type="button" variant="destructive" tooltip="Permanently delete this listing" disabled={pending} onClick={handleDelete}>
              {pending ? "Deleting..." : "Delete Listing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
