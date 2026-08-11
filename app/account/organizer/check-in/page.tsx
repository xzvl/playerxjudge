import type { Metadata } from "next";

import { CheckInPanel } from "@/components/dashboard/organizer/CheckInPanel";

export const metadata: Metadata = { title: "Check-in", robots: { index: false, follow: false } };

export default function CheckInPage() {
  return (
    <div>
      <p className="label-mono text-primary">Organizer Dashboard</p>
      <h1 className="heading mt-2 text-3xl">Check-in</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Mark players present for tournaments about to start.</p>
      <div className="mt-8">
        <CheckInPanel />
      </div>
    </div>
  );
}
