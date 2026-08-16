import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ACCOUNT_SETTINGS_NAV_ITEM, getAccountNavItems } from "@/components/dashboard/accountNavItems";
import { RoleApplicationGate } from "@/components/dashboard/RoleApplicationGate";
import {
  buildNavUser,
  getCurrentUser,
  getCurrentUserCommunityName,
  getCurrentUserRoles,
  getUnreadNotificationCount,
} from "@/lib/supabase/get-user";

export default async function SponsorLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/sponsor/dashboard");

  const roles = await getCurrentUserRoles();
  const sponsorRole = roles.find((r) => r.role === "sponsor");

  if (sponsorRole?.status !== "approved") {
    return (
      <RoleApplicationGate
        roleLabel="Sponsor"
        status={sponsorRole?.status === "rejected" ? "rejected" : sponsorRole ? "pending" : null}
        applyHref="/become/sponsor"
        applyLabel="Apply to Sponsor"
      />
    );
  }

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
