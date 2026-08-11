import type { Metadata } from "next";

import { AnalyticsPanel } from "@/components/dashboard/organizer/AnalyticsPanel";

export const metadata: Metadata = { title: "Analytics", robots: { index: false, follow: false } };

export default function AnalyticsPage() {
  return (
    <div>
      <p className="label-mono text-primary">Organizer Dashboard</p>
      <h1 className="heading mt-2 text-3xl">Analytics</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">
        How your tournaments are performing, at a glance.
      </p>
      <div className="mt-8">
        <AnalyticsPanel />
      </div>
    </div>
  );
}
