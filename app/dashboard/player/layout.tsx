import { redirect } from "next/navigation";
import { Heart, History, LayoutDashboard, ListChecks, Star, Trophy } from "lucide-react";

import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/DashboardShell";
import { getCurrentUser } from "@/lib/supabase/get-user";

const NAV_ITEMS: DashboardNavItem[] = [
  { label: "Overview", href: "/dashboard/player", icon: LayoutDashboard },
  { label: "Upcoming Tournaments", icon: Trophy },
  { label: "Registered Tournaments", icon: ListChecks },
  { label: "Match History", icon: History },
  { label: "Achievements", icon: Star },
  { label: "Favorite Communities", icon: Heart },
];

export default async function PlayerDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/dashboard/player");

  return (
    <DashboardShell roleLabel="Player" navItems={NAV_ITEMS}>
      {children}
    </DashboardShell>
  );
}
