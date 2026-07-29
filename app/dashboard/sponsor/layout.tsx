import { redirect } from "next/navigation";
import { BarChart3, Eye, LayoutDashboard, MousePointerClick, Percent, Receipt, Trophy, Users2 } from "lucide-react";

import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/DashboardShell";
import { getCurrentUser } from "@/lib/supabase/get-user";

const NAV_ITEMS: DashboardNavItem[] = [
  { label: "Overview", href: "/dashboard/sponsor", icon: LayoutDashboard },
  { label: "Campaign Analytics", icon: BarChart3 },
  { label: "Communities Sponsored", icon: Users2 },
  { label: "Tournament Sponsorships", icon: Trophy },
  { label: "Clicks", icon: MousePointerClick },
  { label: "Views", icon: Eye },
  { label: "CTR", icon: Percent },
  { label: "Invoices", icon: Receipt },
];

export default async function SponsorDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/dashboard/sponsor");

  return (
    <DashboardShell roleLabel="Sponsor" navItems={NAV_ITEMS}>
      {children}
    </DashboardShell>
  );
}
