import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ACCOUNT_SETTINGS_NAV_ITEM, getAccountNavItems } from "@/components/dashboard/accountNavItems";
import { getCurrentUser, getCurrentUserRoles } from "@/lib/supabase/get-user";

export default async function AccountSettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/settings");

  const roles = await getCurrentUserRoles();
  const navItems = getAccountNavItems(roles);

  return (
    <DashboardShell roleLabel="Account" navItems={navItems} settingsItem={ACCOUNT_SETTINGS_NAV_ITEM}>
      {children}
    </DashboardShell>
  );
}
