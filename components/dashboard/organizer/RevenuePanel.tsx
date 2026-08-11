import Link from "next/link";
import { Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { FREE_PLAN_TOURNAMENT_LIMIT, MOCK_ORGANIZED_TOURNAMENTS, MOCK_REVENUE } from "@/lib/mock/organizer-dashboard";

export function RevenuePanel() {
  const paid = MOCK_REVENUE.filter((r) => r.status === "paid");
  const pending = MOCK_REVENUE.filter((r) => r.status === "pending");
  const totalPaid = paid.reduce((sum, r) => sum + r.amount, 0);
  const totalPending = pending.reduce((sum, r) => sum + r.amount, 0);

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

      {MOCK_ORGANIZED_TOURNAMENTS.length >= FREE_PLAN_TOURNAMENT_LIMIT ? (
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

      <div className="mt-8 overflow-x-auto border border-outline-variant/25">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="label-mono border-b border-outline-variant/25 text-on-surface/40">
              <th className="p-4" scope="col">Tournament</th>
              <th className="p-4" scope="col">Amount</th>
              <th className="p-4" scope="col">Method</th>
              <th className="p-4" scope="col">Status</th>
              <th className="p-4" scope="col">Paid</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_REVENUE.map((r) => (
              <tr key={r.id} className="border-b border-outline-variant/15 last:border-0 hover:bg-white/[0.02]">
                <td className="p-4 font-medium text-on-surface">{r.tournamentTitle}</td>
                <td className="p-4 font-mono text-on-surface/70">{formatCurrency(r.amount)}</td>
                <td className="p-4 text-on-surface/60">{r.method}</td>
                <td className="p-4">
                  <Badge variant={r.status === "paid" ? "success" : "outline"}>{r.status}</Badge>
                </td>
                <td className="p-4 text-on-surface/60">{r.paidAt ? formatDate(r.paidAt) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
