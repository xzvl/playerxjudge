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

// Deliberately NOT under app/account/judge/(dashboard)/layout.tsx's
// approved-judge gate — this is the page a non-judge reaches from the
// sidebar's "Apply Judge" item (see accountNavItems.tsx), so it has to
// render for exactly the accounts that gate would otherwise turn away.
// Moving the judge dashboard/profile/assigned-tournaments/match-history
// routes into that (dashboard) route group (URLs unchanged — route groups
// don't appear in the path) is what lets this route escape it while still
// living at /account/judge/apply. Same ungated-shell pattern as
// app/account/beyblade/layout.tsx.
export default async function JudgeApplyLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/judge/apply");

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
