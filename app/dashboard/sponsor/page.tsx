import type { Metadata } from "next";

import { DashboardFeatureGrid } from "@/components/dashboard/DashboardFeatureGrid";

export const metadata: Metadata = { title: "Sponsor Dashboard", robots: { index: false, follow: false } };

const FEATURES = [
  "Campaign Analytics",
  "Communities Sponsored",
  "Tournament Sponsorships",
  "Clicks",
  "Views",
  "CTR",
  "Invoices",
];

export default function SponsorDashboardPage() {
  return (
    <DashboardFeatureGrid
      title="Sponsor Dashboard"
      description="Track the performance of your sponsorships across communities and tournaments."
      features={FEATURES}
    />
  );
}
