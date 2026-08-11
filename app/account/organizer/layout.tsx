import { redirect } from "next/navigation";
import {
  BarChart3,
  CheckSquare,
  DollarSign,
  Download,
  FileText,
  Handshake,
  LayoutDashboard,
  Trophy,
  Users,
  Users2,
} from "lucide-react";

import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/DashboardShell";
import { getCurrentUser } from "@/lib/supabase/get-user";

const NAV_ITEMS: DashboardNavItem[] = [
  { label: "Overview", href: "/dashboard/organizer", icon: LayoutDashboard },
  { label: "Analytics", icon: BarChart3 },
  { label: "Revenue", icon: DollarSign },
  { label: "Tournament Management", icon: Trophy },
  { label: "Community Management", icon: Users2 },
  { label: "Sponsors", icon: Handshake },
  { label: "Reports", icon: FileText },
  { label: "Participants", icon: Users },
  { label: "Check-in", icon: CheckSquare },
  { label: "Export CSV", icon: Download },
];

export default async function OrganizerDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/dashboard/organizer");

  return (
    <DashboardShell roleLabel="Organizer" navItems={NAV_ITEMS}>
      {children}
    </DashboardShell>
  );
}
