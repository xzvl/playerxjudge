import type { Metadata } from "next";

import { DashboardFeatureGrid } from "@/components/dashboard/DashboardFeatureGrid";

export const metadata: Metadata = { title: "Admin Dashboard", robots: { index: false, follow: false } };

const FEATURES = [
  "Manage Users",
  "Manage Communities",
  "Manage Sponsors",
  "Manage Subscriptions",
  "Reports",
  "Audit Logs",
  "Platform Analytics",
  "CMS",
  "Feature Flags",
  "Announcements",
];

export default function AdminDashboardPage() {
  return (
    <DashboardFeatureGrid
      title="Admin Dashboard"
      description="Platform-wide management tools for users, communities, sponsors, and subscriptions."
      features={FEATURES}
    />
  );
}
