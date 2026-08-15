import Link from "next/link";
import { Lock } from "lucide-react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { FREE_PLAN_TOURNAMENT_LIMIT } from "@/lib/constants";
import type { PreregistrationPaymentStatus } from "@/lib/types/database";

export interface RevenueRow {
  id: string;
  tournamentTitle: string;
  amount: number;
  status: PreregistrationPaymentStatus;
  submittedAt: string;
}

const STATUS_LABEL: Record<PreregistrationPaymentStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  failed: "Failed",
};

const STATUS_VARIANT: Record<PreregistrationPaymentStatus, BadgeProps["variant"]> = {
  pending: "outline",
  confirmed: "success",
  failed: "destructive",
};

// Revenue collected from guests who checked "Advance Payment" while
// pre-registering (see PreRegisterDialog / tournament_preregistrations) —
// the only real money-tracking data the app has today. There's no separate
// per-submission amount captured (a guest just uploads a screenshot), so
// each row's amount is the tournament's own configured fee — see
// app/account/organizer/revenue/page.tsx.
export function RevenuePanel({ totalTournaments, rows }: { totalTournaments: number; rows: RevenueRow[] }) {
  const totalPaid = rows.filter((r) => r.status === "confirmed").reduce((sum, r) => sum + r.amount, 0);
  const totalPending = rows.filter((r) => r.status === "pending").reduce((sum, r) => sum + r.amount, 0);

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="border border-outline-variant/25 bg-surface-container-low p-5">
          <p className="label-mono text-on-surface/40">Total Collected</p>
          <p className="mt-2 font-mono text-2xl font-bold text-primary">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="border border-outline-variant/25 bg-surface-container-low p-5">
          <p className="label-mono text-on-surface/40">Pending</p>
          <p className="mt-2 font-mono text-2xl font-bold text-on-surface">{formatCurrency(totalPending)}</p>
        </div>
      </div>

      {totalTournaments >= FREE_PLAN_TOURNAMENT_LIMIT ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border border-primary/40 bg-primary/5 p-4">
          <p className="flex items-center gap-2 text-sm text-on-surface/70">
            <Lock className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            Free plan is capped at {FREE_PLAN_TOURNAMENT_LIMIT} tournaments. Upgrade to Premium for unlimited
            tournaments.
          </p>
          <Link href="/become/organizer" className="label-mono shrink-0 text-primary hover:underline">
            Upgrade
          </Link>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="mt-8 overflow-x-auto border border-outline-variant/25">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="label-mono border-b border-outline-variant/25 text-on-surface/40">
                <th className="p-4" scope="col">Tournament</th>
                <th className="p-4" scope="col">Amount</th>
                <th className="p-4" scope="col">Status</th>
                <th className="p-4" scope="col">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-outline-variant/15 last:border-0 hover:bg-white/[0.02]">
                  <td className="p-4 font-medium text-on-surface">{r.tournamentTitle}</td>
                  <td className="p-4 font-mono text-on-surface/70">{formatCurrency(r.amount)}</td>
                  <td className="p-4">
                    <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                  </td>
                  <td className="p-4 text-on-surface/60">{formatDate(r.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-8 border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
          No advance payments submitted yet.
        </p>
      )}
    </div>
  );
}
