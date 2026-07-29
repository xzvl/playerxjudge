import { redirect } from "next/navigation";
import {
  BarChart3,
  CreditCard,
  Flag,
  Handshake,
  LayoutDashboard,
  LayoutTemplate,
  Megaphone,
  ShieldAlert,
  Users,
  Users2,
} from "lucide-react";

import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/DashboardShell";
import { getCurrentUser } from "@/lib/supabase/get-user";

const NAV_ITEMS: DashboardNavItem[] = [
  { label: "Overview", href: "/dashboard/admin", icon: LayoutDashboard },
  { label: "Manage Users", icon: Users },
  { label: "Manage Communities", icon: Users2 },
  { label: "Manage Sponsors", icon: Handshake },
  { label: "Manage Subscriptions", icon: CreditCard },
  { label: "Platform Analytics", icon: BarChart3 },
  { label: "Audit Logs", icon: ShieldAlert },
  { label: "CMS", icon: LayoutTemplate },
  { label: "Feature Flags", icon: Flag },
  { label: "Announcements", icon: Megaphone },
];

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/dashboard/admin");

  return (
    <DashboardShell roleLabel="Admin" navItems={NAV_ITEMS}>
      {children}
    </DashboardShell>
  );
}
