import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ACCOUNT_SETTINGS_NAV_ITEM, getAccountNavItems } from "@/components/dashboard/accountNavItems";
import { RoleApplicationGate } from "@/components/dashboard/RoleApplicationGate";
import { getCurrentUser, getCurrentUserRoles } from "@/lib/supabase/get-user";

export default async function OrganizerDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/organizer/dashboard");

  const roles = await getCurrentUserRoles();
  const organizerRole = roles.find((r) => r.role === "organizer");

  if (organizerRole?.status !== "approved") {
    return (
      <RoleApplicationGate
        roleLabel="Organizer"
        status={organizerRole?.status === "rejected" ? "rejected" : organizerRole ? "pending" : null}
        applyHref="/become/organizer"
        applyLabel="Apply to Organize"
      />
    );
  }

  const navItems = getAccountNavItems(roles);

  return (
    <DashboardShell roleLabel="Account" navItems={navItems} settingsItem={ACCOUNT_SETTINGS_NAV_ITEM}>
      {children}
    </DashboardShell>
  );
}
