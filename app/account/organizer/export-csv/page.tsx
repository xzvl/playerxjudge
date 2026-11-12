import type { Metadata } from "next";

import { ExportCsvPanel } from "@/components/dashboard/organizer/ExportCsvPanel";
import { PageHeader } from "@/components/dashboard/erp";

export const metadata: Metadata = { title: "Export CSV", robots: { index: false, follow: false } };

export default function ExportCsvPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Organizer Dashboard"
        title="Export CSV"
        description="Download participant or revenue data for a tournament."
      />
      <div className="mt-5">
        <ExportCsvPanel />
      </div>
    </div>
  );
}
