import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ACCOUNT_SETTINGS_NAV_ITEM, getAccountNavItems } from "@/components/dashboard/accountNavItems";
import { RoleApplicationGate } from "@/components/dashboard/RoleApplicationGate";
import { getCurrentUser, getCurrentUserRoles } from "@/lib/supabase/get-user";

export default async function JudgeLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/judge/dashboard");

  const roles = await getCurrentUserRoles();
  const judgeRole = roles.find((r) => r.role === "judge");

  if (judgeRole?.status !== "approved") {
    return (
      <RoleApplicationGate
        roleLabel="Judge"
        status={judgeRole?.status === "rejected" ? "rejected" : judgeRole ? "pending" : null}
        applyHref="/become/judge"
        applyLabel="Apply to be a Judge"
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
