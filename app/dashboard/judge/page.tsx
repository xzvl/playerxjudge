import type { Metadata } from "next";

import { DashboardFeatureGrid } from "@/components/dashboard/DashboardFeatureGrid";

export const metadata: Metadata = { title: "Judge Dashboard", robots: { index: false, follow: false } };

const FEATURES = [
  "Assigned Tournaments",
  "Scoring Interface",
  "Match History",
  "Performance",
  "Leaderboard",
];

export default function JudgeDashboardPage() {
  return (
    <DashboardFeatureGrid
      title="Judge Dashboard"
      description="Your assigned tournaments and scoring tools will appear here. Requires a Premium subscription."
      features={FEATURES}
    />
  );
}
