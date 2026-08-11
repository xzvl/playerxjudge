import type { Metadata } from "next";

import { CommunityManagementPanel } from "@/components/dashboard/organizer/CommunityManagementPanel";

export const metadata: Metadata = { title: "Community Management", robots: { index: false, follow: false } };

export default function CommunityManagementPage() {
  return (
    <div>
      <p className="label-mono text-primary">Organizer Dashboard</p>
      <h1 className="heading mt-2 text-3xl">Community Management</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Communities you own or help run.</p>
      <div className="mt-8">
        <CommunityManagementPanel />
      </div>
    </div>
  );
}
