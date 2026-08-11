import type { Metadata } from "next";

import { ReportsPanel } from "@/components/dashboard/organizer/ReportsPanel";

export const metadata: Metadata = { title: "Reports", robots: { index: false, follow: false } };

export default function ReportsPage() {
  return (
    <div>
      <p className="label-mono text-primary">Organizer Dashboard</p>
      <h1 className="heading mt-2 text-3xl">Reports</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Moderation reports filed against your tournaments and communities.</p>
      <div className="mt-8">
        <ReportsPanel />
      </div>
    </div>
  );
}
