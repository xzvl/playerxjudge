"use client";

import { useState, useTransition } from "react";
import { Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import { approveCommunity, rejectCommunity } from "@/app/account/admin/communities/actions";

export interface PendingCommunityItem {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  locationLine: string;
  ownerName: string;
  submittedAt: string;
}

function RejectDialog({
  item,
  onOpenChange,
  pending,
  onConfirm,
}: {
  item: PendingCommunityItem | null;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onConfirm: () => void;
}) {
  if (!item) return null;
  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reject {item.name}?</DialogTitle>
          <DialogDescription>
            This permanently deletes the application and its logos. The organizer can submit a new application if they
            want to try again.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="p-6 pt-0">
          <Button type="button" variant="destructive" tooltip="Permanently reject this application" disabled={pending} onClick={onConfirm}>
            {pending ? "Rejecting..." : "Reject Application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// The whole admin-side of the "Apply Community" flow (see the Create
// Community form's own "Submit Application" button) — a queue of everything
// still `approval_status: 'pending'`, with Approve (flips it to approved,
// making it public on /communities) or Reject (deletes it outright, same as
// the organizer's own Delete).
export function CommunityApprovalPanel({ items }: { items: PendingCommunityItem[] }) {
  const [rows, setRows] = useState(items);
  const [rejecting, setRejecting] = useState<PendingCommunityItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleApprove(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await approveCommunity(id);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
    });
  }

  function handleReject() {
    if (!rejecting) return;
    setError(null);
    startTransition(async () => {
      const result = await rejectCommunity(rejecting.id);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== rejecting.id));
      setRejecting(null);
    });
  }

  if (rows.length === 0) {
    return (
      <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
        No pending applications right now.
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

      <ul className="space-y-3">
        {rows.map((item) => (
          <li key={item.id} className="flex items-start gap-4 border border-outline-variant/25 bg-surface-container-low p-4">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border border-outline-variant/40 text-primary">
              {item.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-4 w-4" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-on-surface">{item.name}</p>
              <p className="mt-1 text-sm text-on-surface/60">{item.locationLine}</p>
              <p className="label-mono mt-2 text-on-surface/30">
                Applied by {item.ownerName} &middot; {formatDate(item.submittedAt)}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="sm" tooltip="Approve this application" disabled={pending} onClick={() => handleApprove(item.id)}>
                Approve
              </Button>
              <Button variant="outline" size="sm" tooltip="Reject this application" disabled={pending} onClick={() => setRejecting(item)}>
                Reject
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <RejectDialog item={rejecting} onOpenChange={(open) => !open && setRejecting(null)} pending={pending} onConfirm={handleReject} />
    </div>
  );
}
