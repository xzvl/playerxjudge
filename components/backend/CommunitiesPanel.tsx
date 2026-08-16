"use client";

import { useMemo, useState, useTransition } from "react";
import { Building2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CommunityApprovalStatusBadge, CommunityStatusBadge } from "@/components/dashboard/organizer/badges";
import { adminDeleteCommunity, approveCommunity, rejectCommunity } from "@/app/backend/communities/actions";
import { formatDate } from "@/lib/format";
import type { CommunityRow } from "@/lib/types/database";

export interface PendingCommunityItem {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  locationLine: string;
  ownerName: string;
  submittedAt: string;
}

export interface CommunityItem {
  id: string;
  name: string;
  slug: string;
  status: CommunityRow["status"];
  approvalStatus: CommunityRow["approval_status"];
  memberCount: number;
  ownerName: string;
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

function DeleteDialog({
  item,
  onOpenChange,
  pending,
  onConfirm,
}: {
  item: CommunityItem | null;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onConfirm: () => void;
}) {
  if (!item) return null;
  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete {item.name}?</DialogTitle>
          <DialogDescription>
            This permanently deletes the community and its logos. Tournaments it hosted aren&apos;t deleted — they just
            become independent.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="p-6 pt-0">
          <Button type="button" variant="destructive" tooltip="Permanently delete this community" disabled={pending} onClick={onConfirm}>
            {pending ? "Deleting..." : "Delete Community"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Pending queue (approve/reject — see the "Submit Application" step of the
// Create Community form) plus every community, platform-wide, with a
// Delete action — migrates app/account/admin/communities' whole flow in
// and adds the full-manage half /backend calls for.
export function CommunitiesPanel({ pending: pendingItems, communities }: { pending: PendingCommunityItem[]; communities: CommunityItem[] }) {
  const [queue, setQueue] = useState(pendingItems);
  const [rows, setRows] = useState(communities);
  const [query, setQuery] = useState("");
  const [rejecting, setRejecting] = useState<PendingCommunityItem | null>(null);
  const [deleting, setDeleting] = useState<CommunityItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.ownerName.toLowerCase().includes(q));
  }, [rows, query]);

  function handleApprove(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await approveCommunity(id);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      const approved = queue.find((q) => q.id === id);
      setQueue((prev) => prev.filter((q) => q.id !== id));
      if (approved) {
        setRows((prev) => [
          { id: approved.id, name: approved.name, slug: approved.slug, status: "active", approvalStatus: "approved", memberCount: 0, ownerName: approved.ownerName },
          ...prev,
        ]);
      }
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
      setQueue((prev) => prev.filter((q) => q.id !== rejecting.id));
      setRejecting(null);
    });
  }

  function handleDelete() {
    if (!deleting) return;
    setError(null);
    startTransition(async () => {
      const result = await adminDeleteCommunity(deleting.id);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== deleting.id));
      setDeleting(null);
    });
  }

  return (
    <div className="space-y-10">
      {error ? (
        <p role="alert" className="border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <section>
        <h2 className="label-mono mb-4 text-primary">Pending Applications</h2>
        {queue.length === 0 ? (
          <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
            No pending applications right now.
          </p>
        ) : (
          <ul className="space-y-3">
            {queue.map((item) => (
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
                  <Button variant="outline" size="sm" tooltip="Approve this application" disabled={busy} onClick={() => handleApprove(item.id)}>
                    Approve
                  </Button>
                  <Button variant="outline" size="sm" tooltip="Reject this application" disabled={busy} onClick={() => setRejecting(item)}>
                    Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="label-mono mb-4 text-on-surface/40">All Communities</h2>
        <Input
          className="mb-4 w-full max-w-xs"
          placeholder="Search by name or owner..."
          aria-label="Search communities"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {filtered.length > 0 ? (
          <div className="overflow-x-auto border border-outline-variant/25">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="label-mono border-b border-outline-variant/25 text-on-surface/40">
                  <th className="p-4" scope="col">Community</th>
                  <th className="p-4" scope="col">Owner</th>
                  <th className="p-4" scope="col">Members</th>
                  <th className="p-4" scope="col">Status</th>
                  <th className="p-4" scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-outline-variant/15 last:border-0 hover:bg-white/[0.02]">
                    <td className="p-4 font-medium text-on-surface">{c.name}</td>
                    <td className="p-4 text-on-surface/60">{c.ownerName}</td>
                    <td className="p-4 text-on-surface/60">{c.memberCount}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        <CommunityStatusBadge status={c.status} />
                        <CommunityApprovalStatusBadge status={c.approvalStatus} />
                      </div>
                    </td>
                    <td className="p-4">
                      <Button variant="ghost" size="icon" tooltip="Delete this community" aria-label={`Delete ${c.name}`} disabled={busy} onClick={() => setDeleting(c)}>
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
            No communities match your search.
          </p>
        )}
      </section>

      <RejectDialog item={rejecting} onOpenChange={(open) => !open && setRejecting(null)} pending={busy} onConfirm={handleReject} />
      <DeleteDialog item={deleting} onOpenChange={(open) => !open && setDeleting(null)} pending={busy} onConfirm={handleDelete} />
    </div>
  );
}
