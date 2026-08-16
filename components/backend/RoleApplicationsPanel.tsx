"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDecide(id: string, action: (id: string) => Promise<{ status: string; message?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action(id);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
    });
  }

  if (rows.length === 0) {
    return (
      <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
        No pending applications.
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

      <div className="space-y-3">
        {rows.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
              <div>
                <p className="text-sm font-medium text-on-surface">
                  {item.applicantName} <span className="text-on-surface/40">@{item.applicantUsername}</span>
                </p>
                <p className="label-mono mt-1 text-primary">{item.role}</p>
                <p className="mt-1 text-xs text-on-surface/40">Requested {formatDate(item.requestedAt)}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  tooltip="Approve this role application"
                  disabled={pending}
                  onClick={() => handleDecide(item.id, approveRoleRequest)}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  tooltip="Reject this role application"
                  disabled={pending}
                  onClick={() => handleDecide(item.id, rejectRoleRequest)}
                >
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
