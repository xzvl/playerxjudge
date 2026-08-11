import { redirect } from "next/navigation";
import { BarChart3, Gavel, History, LayoutDashboard, ListChecks, Trophy } from "lucide-react";

import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/DashboardShell";
import { getCurrentUser } from "@/lib/supabase/get-user";

const NAV_ITEMS: DashboardNavItem[] = [
  { label: "Overview", href: "/dashboard/judge", icon: LayoutDashboard },
  { label: "Assigned Tournaments", icon: ListChecks },
  { label: "Scoring Interface", icon: Gavel },
  { label: "Match History", icon: History },
  { label: "Performance", icon: BarChart3 },
  { label: "Leaderboard", icon: Trophy },
];

export default async function JudgeDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/dashboard/judge");

  return (
    <DashboardShell roleLabel="Judge" navItems={NAV_ITEMS}>
      {children}
    </DashboardShell>
  );
}
