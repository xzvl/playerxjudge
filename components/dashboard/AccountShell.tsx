import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ACCOUNT_SETTINGS_NAV_ITEM, getAccountNavItems } from "@/components/dashboard/accountNavItems";
import { RoleApplicationGate } from "@/components/dashboard/RoleApplicationGate";
import { getShellData } from "@/lib/supabase/get-user";
import type { AppRole } from "@/lib/types/database";

// The shared server wrapper behind every /account/* layout: one parallel
// fetch of the shell data (user, roles, unread count, community; see
// getShellData), an optional approved-role gate, then the DashboardShell.
export async function AccountShell({
  redirectTo,
  gate,
  children,
}: {
  // Where /login sends the user back to after signing in.
  redirectTo: string;
  // Require an approved role; otherwise show its application status.
  gate?: { role: AppRole; label: string; applyHref: string; applyLabel: string };
  children: React.ReactNode;
}) {
  const shell = await getShellData();
  if (!shell) redirect(`/login?redirectTo=${redirectTo}`);

  if (gate) {
    const row = shell.roles.find((r) => r.role === gate.role);
    if (row?.status !== "approved") {
      return (
        <RoleApplicationGate
          roleLabel={gate.label}
          status={row?.status === "rejected" ? "rejected" : row ? "pending" : null}
          applyHref={gate.applyHref}
          applyLabel={gate.applyLabel}
        />
      );
    }
  }

  return (
    <DashboardShell
      roleLabel="Account"
      navItems={getAccountNavItems(shell.roles)}
      settingsItem={ACCOUNT_SETTINGS_NAV_ITEM}
      user={shell.navUser}
      notificationCount={shell.notificationCount}
    >
      {children}
    </DashboardShell>
  );
}
