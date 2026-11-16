import type { Metadata } from "next";

import { MaintenanceEditor } from "@/components/backend/content/SectionEditors";
import { PageHeader } from "@/components/dashboard/erp";
import { getSiteContentFresh } from "@/lib/site-content/editor-data";

export const metadata: Metadata = { title: "Maintenance Mode", robots: { index: false, follow: false } };

export default async function BackendMaintenancePage() {
  const content = await getSiteContentFresh();
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Backend" title="Maintenance mode" description="Take the public site offline while you work on it." />
      <MaintenanceEditor initial={content.maintenance} />
    </div>
  );
}
