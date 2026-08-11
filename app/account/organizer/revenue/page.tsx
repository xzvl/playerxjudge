import type { Metadata } from "next";

import { RevenuePanel } from "@/components/dashboard/organizer/RevenuePanel";

export const metadata: Metadata = { title: "Revenue", robots: { index: false, follow: false } };

export default function RevenuePage() {
  return (
    <div>
      <p className="label-mono text-primary">Organizer Dashboard</p>
      <h1 className="heading mt-2 text-3xl">Revenue</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Entry fee collections across your tournaments.</p>
      <div className="mt-8">
        <RevenuePanel />
      </div>
    </div>
  );
}
