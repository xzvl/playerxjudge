import type { Metadata } from "next";

import { ExportCsvPanel } from "@/components/dashboard/organizer/ExportCsvPanel";

export const metadata: Metadata = { title: "Export CSV", robots: { index: false, follow: false } };

export default function ExportCsvPage() {
  return (
    <div>
      <p className="label-mono text-primary">Organizer Dashboard</p>
      <h1 className="heading mt-2 text-3xl">Export CSV</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Download participant or revenue data for a tournament.</p>
      <div className="mt-8">
        <ExportCsvPanel />
      </div>
    </div>
  );
}
