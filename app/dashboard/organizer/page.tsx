import type { Metadata } from "next";

import { DashboardFeatureGrid } from "@/components/dashboard/DashboardFeatureGrid";

export const metadata: Metadata = { title: "Organizer Dashboard", robots: { index: false, follow: false } };

const FEATURES = [
  "Analytics",
  "Revenue",
  "Tournament Management",
  "Community Management",
  "Sponsors",
  "Reports",
  "Participants",
  "Check-in",
  "Export CSV",
];

export default function OrganizerDashboardPage() {
  return (
    <DashboardFeatureGrid
      title="Organizer Dashboard"
      description="Manage your tournaments, communities, and revenue from one place."
      features={FEATURES}
    />
  );
}
