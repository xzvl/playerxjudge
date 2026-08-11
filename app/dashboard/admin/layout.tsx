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
import { getCurrentUser, getCurrentUserRoles } from "@/lib/supabase/get-user";

const NAV_ITEMS: DashboardNavItem[] = [
  { label: "Overview", href: "/dashboard/admin", icon: <LayoutDashboard className="h-4 w-4 shrink-0" /> },
  { label: "Manage Users", icon: <Users className="h-4 w-4 shrink-0" /> },
  { label: "Manage Communities", icon: <Users2 className="h-4 w-4 shrink-0" /> },
  { label: "Manage Sponsors", icon: <Handshake className="h-4 w-4 shrink-0" /> },
  { label: "Manage Subscriptions", icon: <CreditCard className="h-4 w-4 shrink-0" /> },
  { label: "Platform Analytics", icon: <BarChart3 className="h-4 w-4 shrink-0" /> },
  { label: "Audit Logs", icon: <ShieldAlert className="h-4 w-4 shrink-0" /> },
  { label: "CMS", icon: <LayoutTemplate className="h-4 w-4 shrink-0" /> },
  { label: "Feature Flags", icon: <Flag className="h-4 w-4 shrink-0" /> },
  { label: "Announcements", icon: <Megaphone className="h-4 w-4 shrink-0" /> },
];

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/dashboard/admin");

  const roles = await getCurrentUserRoles();
  const isStaff = roles.some((r) => (r.role === "admin" || r.role === "manager") && r.status === "approved");
  if (!isStaff) redirect("/");

  return (
    <DashboardShell roleLabel="Admin" navItems={NAV_ITEMS}>
      {children}
    </DashboardShell>
  );
}
