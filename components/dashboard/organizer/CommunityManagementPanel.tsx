"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { MapPin, Pencil, Trash2, Users2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CommunityApprovalStatusBadge, CommunityStatusBadge } from "@/components/dashboard/organizer/badges";
import { deleteCommunity } from "@/app/account/organizer/community/actions";
import { formatDate } from "@/lib/format";
import type { CommunityRow } from "@/lib/types/database";

export interface CommunityListItem {
  community: CommunityRow;
  // Edit/Delete are owner-only (mirrors communities_update/delete_owner_or_admin
  // — a staff `organizers` row doesn't grant those) — hidden rather than
  // shown-then-failing for a helper who isn't the owner.
  isOwner: boolean;
}

function locationLine(community: CommunityRow): string {
  return [community.address_line, community.city, community.province].filter(Boolean).join(", ") || "—";
}

function DeleteCommunityDialog({
  item,
  onOpenChange,
  pending,
  onConfirm,
}: {
  item: CommunityListItem | null;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onConfirm: () => void;
}) {
  if (!item) return null;
  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete {item.community.name}?</DialogTitle>
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

export function CommunityManagementPanel({ items }: { items: CommunityListItem[] }) {
  const [rows, setRows] = useState(items);
  const [deleting, setDeleting] = useState<CommunityListItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!deleting) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCommunity(deleting.community.id);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setRows((prev) => prev.filter((r) => r.community.id !== deleting.community.id));
      setDeleting(null);
    });
  }

  if (rows.length === 0) {
    return (
      <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
        You don&apos;t manage any communities yet.
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
        {rows.map((item) => {
          const { community, isOwner } = item;
          return (
            <div key={community.id} className="border border-outline-variant/25 bg-surface-container-low p-5">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border border-outline-variant/40 text-primary">
                  {community.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={community.logo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Users2 className="h-4 w-4" aria-hidden="true" />
                  )}
                </div>
                <div className="flex flex-row items-end gap-1">
                  <CommunityStatusBadge status={community.status} />
                  <CommunityApprovalStatusBadge status={community.approval_status} />
                </div>
              </div>

              <Link href={`/communities/${community.slug}`} className="heading block text-base leading-tight hover:text-primary">
                {community.name}
              </Link>
              <p className="mt-1 flex items-start gap-1.5 text-xs text-on-surface/50">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" /> {locationLine(community)}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-sm text-on-surface/70">{community.member_count} members</p>
                <p className="label-mono text-on-surface/40">Since {formatDate(community.started_at ?? community.created_at)}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm" className="flex-1 gap-1.5" tooltip="View and manage members">
                  <Link href={`/account/organizer/community/${community.slug}/members`}>
                    <Users2 className="h-3.5 w-3.5" /> Members
                  </Link>
                </Button>
                {isOwner ? (
                  <>
                    <Button asChild variant="outline" size="icon" tooltip="Edit this community">
                      <Link href={`/account/organizer/community/${community.slug}/settings`} aria-label={`Edit ${community.name}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      tooltip="Delete this community"
                      aria-label={`Delete ${community.name}`}
                      onClick={() => setDeleting(item)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <DeleteCommunityDialog item={deleting} onOpenChange={(open) => !open && setDeleting(null)} pending={pending} onConfirm={handleDelete} />
    </div>
  );
}
