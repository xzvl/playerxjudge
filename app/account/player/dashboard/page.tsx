import type { Metadata } from "next";

import { DashboardFeatureGrid } from "@/components/dashboard/DashboardFeatureGrid";

export const metadata: Metadata = { title: "Player Dashboard", robots: { index: false, follow: false } };

const FEATURES = [
  "Upcoming Tournaments",
  "Registered Tournaments",
  "Match History",
  "Achievements",
  "Statistics",
  "Favorite Communities",
  "Notifications",
];

export default function PlayerDashboardPage() {
  return (
    <DashboardFeatureGrid
      title="Player Dashboard"
      description="Your tournament activity, match history, and achievements will appear here."
      features={FEATURES}
    />
  );
}
