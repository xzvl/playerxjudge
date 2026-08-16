"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Facebook, Globe, Handshake, Pencil, RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SponsorApprovalStatusBadge, SponsorStatusBadge } from "@/components/dashboard/sponsor/badges";
import { deleteSponsorListing, renewSponsorListing } from "@/app/account/sponsor/dashboard/actions";
import { DONATION_TIERS, tierLabel } from "@/lib/sponsors/status";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Sponsor, SponsorDonationTier } from "@/lib/types/database";

function DeleteSponsorDialog({
  sponsor,
  onOpenChange,
  pending,
  onConfirm,
}: {
  sponsor: Sponsor | null;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onConfirm: () => void;
}) {
  if (!sponsor) return null;
  return (
    <Dialog open={sponsor !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete {sponsor.company_name}?</DialogTitle>
          <DialogDescription>This permanently deletes this sponsor listing and its logo.</DialogDescription>
        </DialogHeader>
        <DialogFooter className="p-6 pt-0">
          <Button type="button" variant="destructive" tooltip="Permanently delete this listing" disabled={pending} onClick={onConfirm}>
            {pending ? "Deleting..." : "Delete Listing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RenewSponsorDialog({
  sponsor,
  onOpenChange,
  pending,
  onConfirm,
}: {
  sponsor: Sponsor | null;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onConfirm: (tier: SponsorDonationTier) => void;
}) {
  const [tier, setTier] = useState<SponsorDonationTier | null>(sponsor?.donation_tier ?? null);
  if (!sponsor) return null;

  return (
    <Dialog open={sponsor !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Renew {sponsor.company_name}</DialogTitle>
          <DialogDescription>
            Pick a tier, then email your donation receipt to{" "}
            <a href="mailto:xzviel@gmail.com" className="text-primary hover:underline">
              xzviel@gmail.com
            </a>{" "}
            — we&apos;ll activate it once confirmed.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3 px-6">
          {DONATION_TIERS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTier(t.value)}
              className={cn(
                "flex flex-col items-center gap-1 border px-3 py-4 text-center transition-colors",
                tier === t.value ? "border-primary bg-primary/10 text-primary" : "border-outline-variant/40 text-on-surface/70 hover:border-outline-variant/60"
              )}
            >
              <span className="text-lg font-black">{t.price}</span>
              <span className="text-xs text-on-surface/60">{t.duration}</span>
            </button>
          ))}
        </div>
        <DialogFooter className="p-6 pt-4">
          <Button
            type="button"
            tooltip="Submit this tier for renewal"
            disabled={pending || !tier}
            onClick={() => tier && onConfirm(tier)}
          >
            {pending ? "Submitting..." : "Submit Renewal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SponsorListingsPanel({ items }: { items: Sponsor[] }) {
  const [rows, setRows] = useState(items);
  const [deleting, setDeleting] = useState<Sponsor | null>(null);
  const [renewing, setRenewing] = useState<Sponsor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!deleting) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteSponsorListing(deleting.id);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== deleting.id));
      setDeleting(null);
    });
  }

  function handleRenew(tier: SponsorDonationTier) {
    if (!renewing) return;
    setError(null);
    startTransition(async () => {
      const result = await renewSponsorListing(renewing.id, tier);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setRows((prev) =>
        prev.map((r) => (r.id === renewing.id ? { ...r, donation_tier: tier, approval_status: "pending" } : r))
      );
      setRenewing(null);
    });
  }

  if (rows.length === 0) {
    return (
      <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
        You don&apos;t have any sponsor listings yet.
      </p>
    );
  }

  return (
    <div>
      {error ? (
        <p role="alert" className="mb-4 border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((sponsor) => (
          <div key={sponsor.id} className="border border-outline-variant/25 bg-surface-container-low p-5">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border border-outline-variant/40 text-primary">
                {sponsor.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sponsor.logo_url} alt="" className="h-full w-full object-contain" />
                ) : (
                  <Handshake className="h-4 w-4" aria-hidden="true" />
                )}
              </div>
              <div className="flex flex-row items-end gap-1">
                <SponsorStatusBadge sponsor={sponsor} />
                <SponsorApprovalStatusBadge status={sponsor.approval_status} />
              </div>
            </div>

            <p className="heading text-base leading-tight">{sponsor.company_name}</p>
            <div className="mt-1 space-y-0.5 text-xs text-on-surface/50">
              {sponsor.website_url ? (
                <a href={sponsor.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-primary">
                  <Globe className="h-3 w-3 shrink-0" aria-hidden="true" /> {sponsor.website_url}
                </a>
              ) : null}
              {sponsor.facebook_url ? (
                <a href={sponsor.facebook_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-primary">
                  <Facebook className="h-3 w-3 shrink-0" aria-hidden="true" /> {sponsor.facebook_url}
                </a>
              ) : null}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-on-surface/70">{tierLabel(sponsor.donation_tier)}</p>
              <p className="label-mono text-on-surface/40">
                {sponsor.tier_expires_at ? `Expires ${formatDate(sponsor.tier_expires_at)}` : "No expiry set"}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="flex-1 gap-1.5" tooltip="Renew this listing's tier" onClick={() => setRenewing(sponsor)}>
                <RefreshCw className="h-3.5 w-3.5" /> Renew
              </Button>
              <Button asChild variant="outline" size="icon" tooltip="Edit this listing">
                <Link href={`/account/sponsor/${sponsor.id}/edit`} aria-label={`Edit ${sponsor.company_name}`}>
                  <Pencil className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="icon"
                tooltip="Delete this listing"
                aria-label={`Delete ${sponsor.company_name}`}
                onClick={() => setDeleting(sponsor)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <DeleteSponsorDialog sponsor={deleting} onOpenChange={(open) => !open && setDeleting(null)} pending={pending} onConfirm={handleDelete} />
      <RenewSponsorDialog sponsor={renewing} onOpenChange={(open) => !open && setRenewing(null)} pending={pending} onConfirm={handleRenew} />
    </div>
  );
}
