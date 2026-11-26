"use client";

import { useMemo, useState, useTransition } from "react";
import { Building2, Trash2 } from "lucide-react";

import { InlineAlert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { PageToolbar } from "@/components/ui/page-toolbar";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/dashboard/erp";
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
    <div className="space-y-8">
      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

      <section aria-labelledby="pending-communities" className="space-y-3">
        <h2 id="pending-communities" className="label-mono text-primary">
          Pending Applications{queue.length > 0 ? ` (${queue.length})` : ""}
        </h2>
        {queue.length === 0 ? (
          <EmptyState title="No pending applications" description="New community applications show up here for review." />
        ) : (
          <ul className="space-y-2.5">
            {queue.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-3 rounded-[3px] border border-outline-variant/25 bg-surface-container-low p-4 sm:flex-row sm:items-start sm:gap-4"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[3px] border border-outline-variant/40 text-primary">
                    {item.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.logoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Building2 className="h-4 w-4" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-on-surface">{item.name}</p>
                    <p className="mt-0.5 text-[13px] text-on-surface/60">{item.locationLine}</p>
                    <p className="mt-1.5 text-xs text-on-surface/40">
                      Applied by {item.ownerName} &middot; {formatDate(item.submittedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2 max-sm:[&>button]:flex-1">
                  <Button variant="outline" size="sm" tooltip="Reject this application" disabled={busy} onClick={() => setRejecting(item)}>
                    Reject
                  </Button>
                  <Button size="sm" tooltip="Approve this application" disabled={busy} onClick={() => handleApprove(item.id)}>
                    Approve
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="all-communities" className="space-y-3">
        <h2 id="all-communities" className="label-mono text-on-surface/50">
          All Communities
        </h2>
        <PageToolbar
          search={
            <SearchInput
              placeholder="Search by name or owner"
              aria-label="Search communities"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          }
        />
        <DataTable
          caption="All communities"
          rows={filtered}
          rowKey={(c) => c.id}
          minWidth={680}
          empty={{ title: "No communities found", description: "Try a different name or owner." }}
          columns={[
            { key: "name", header: "Community", className: "font-medium text-on-surface", cell: (c) => c.name },
            { key: "owner", header: "Owner", className: "text-on-surface/60", cell: (c) => c.ownerName },
            { key: "members", header: "Members", className: "text-on-surface/60", cell: (c) => c.memberCount },
            {
              key: "status",
              header: "Status",
              cell: (c) => (
                <div className="flex flex-wrap gap-1">
                  <CommunityStatusBadge status={c.status} />
                  <CommunityApprovalStatusBadge status={c.approvalStatus} />
                </div>
              ),
            },
            {
              key: "actions",
              actions: true,
              cell: (c) => (
                <Button variant="ghost" size="icon" tooltip="Delete this community" aria-label={`Delete ${c.name}`} disabled={busy} onClick={() => setDeleting(c)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              ),
            },
          ]}
        />
      </section>

      <ConfirmDialog
        open={rejecting !== null}
        onOpenChange={(open) => !open && setRejecting(null)}
        title={`Reject ${rejecting?.name ?? "application"}?`}
        description="This permanently deletes the application and its logos. The organizer can submit a new application if they want to try again."
        confirmLabel="Reject Application"
        pendingLabel="Rejecting…"
        pending={busy}
        onConfirm={handleReject}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "community"}?`}
        description="This permanently deletes the community and its logos. Tournaments it hosted aren't deleted — they just become independent."
        confirmLabel="Delete Community"
        pendingLabel="Deleting…"
        pending={busy}
        onConfirm={handleDelete}
      />
    </div>
  );
}
