"use client";

import { useState, useTransition } from "react";

import { InlineAlert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/dashboard/erp";
import { approveRoleRequest, rejectRoleRequest } from "@/app/backend/role-applications/actions";
import { formatDate } from "@/lib/format";
import type { AppRole } from "@/lib/types/database";

export interface RoleApplicationItem {
  id: string;
  role: AppRole;
  requestedAt: string;
  applicantName: string;
  applicantUsername: string;
}

export function RoleApplicationsPanel({ items }: { items: RoleApplicationItem[] }) {
  const [rows, setRows] = useState(items);
  const [rejecting, setRejecting] = useState<RoleApplicationItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDecide(id: string, action: (id: string) => Promise<{ status: string; message?: string }>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action(id);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      after?.();
    });
  }

  if (rows.length === 0) {
    return <EmptyState title="No pending applications" description="Role applications from players show up here for review." />;
  }

  return (
    <div className="space-y-4">
      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

      <ul className="space-y-2.5">
        {rows.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-3 rounded-[3px] border border-outline-variant/25 bg-surface-container-low p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-on-surface">
                {item.applicantName} <span className="font-normal text-on-surface/40">@{item.applicantUsername}</span>
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <StatusBadge tone="accent">{item.role}</StatusBadge>
                <span className="text-xs text-on-surface/40">Requested {formatDate(item.requestedAt)}</span>
              </div>
            </div>
            <div className="flex shrink-0 gap-2 max-sm:[&>button]:flex-1">
              <Button size="sm" variant="outline" tooltip="Reject this role application" disabled={pending} onClick={() => setRejecting(item)}>
                Reject
              </Button>
              <Button size="sm" tooltip="Approve this role application" disabled={pending} onClick={() => handleDecide(item.id, approveRoleRequest)}>
                Approve
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={rejecting !== null}
        onOpenChange={(open) => !open && setRejecting(null)}
        title={`Reject ${rejecting?.applicantName ?? "application"}?`}
        description={`This declines their ${rejecting?.role ?? ""} application.`}
        confirmLabel="Reject Application"
        pendingLabel="Rejecting…"
        pending={pending}
        onConfirm={() => rejecting && handleDecide(rejecting.id, rejectRoleRequest, () => setRejecting(null))}
      />
    </div>
  );
}
