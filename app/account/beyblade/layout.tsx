import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ACCOUNT_SETTINGS_NAV_ITEM, getAccountNavItems } from "@/components/dashboard/accountNavItems";
import {
  buildNavUser,
  getCurrentUser,
  getCurrentUserCommunityName,
  getCurrentUserRoles,
  getUnreadNotificationCount,
} from "@/lib/supabase/get-user";

// Not role-gated like the player/judge/organizer/sponsor dashboards —
// every signed-in account can save combos and build a deck.
export default async function BeybladeDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/beyblade/dashboard");

  const roles = await getCurrentUserRoles();
  const navItems = getAccountNavItems(roles);
  const [notificationCount, communityName] = await Promise.all([
    getUnreadNotificationCount(),
    getCurrentUserCommunityName(),
  ]);
  const navUser = buildNavUser(user, roles, communityName);

  return (
    <DashboardShell
      roleLabel="Account"
      navItems={navItems}
      settingsItem={ACCOUNT_SETTINGS_NAV_ITEM}
      user={navUser}
      notificationCount={notificationCount}
    >
      {children}
    </DashboardShell>
  );
}
