import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";

import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/DashboardShell";
import { getCurrentUser, getCurrentProfile, isAdminProfile } from "@/lib/supabase/get-user";

const ADMIN_NAV_ITEMS: DashboardNavItem[] = [
  { label: "Communities", href: "/account/admin/communities", icon: <Building2 className="h-4 w-4 shrink-0" /> },
];

// No self-service application here, unlike organizer/judge/sponsor (see
// RoleApplicationGate) — a profile's `role` is a platform-level column
// nobody can request their way into from the app. Not signed in or not an
// admin/super_admin both just bounce home rather than showing a "pending"
// state that could never resolve.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/admin/communities");

  const profile = await getCurrentProfile();
  if (!isAdminProfile(profile)) redirect("/");

  return (
    <DashboardShell roleLabel="Admin" navItems={ADMIN_NAV_ITEMS}>
      {children}
    </DashboardShell>
  );
}
