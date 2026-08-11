import { redirect } from "next/navigation";
import { BarChart3, Gavel, History, LayoutDashboard, ListChecks, Trophy } from "lucide-react";

import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/DashboardShell";
import { RoleApplicationGate } from "@/components/dashboard/RoleApplicationGate";
import { getCurrentUser, getCurrentUserRoles } from "@/lib/supabase/get-user";

const NAV_ITEMS: DashboardNavItem[] = [
  { label: "Overview", href: "/account/judge/dashboard", icon: <LayoutDashboard className="h-4 w-4 shrink-0" /> },
  { label: "Assigned Tournaments", icon: <ListChecks className="h-4 w-4 shrink-0" /> },
  { label: "Scoring Interface", icon: <Gavel className="h-4 w-4 shrink-0" /> },
  { label: "Match History", icon: <History className="h-4 w-4 shrink-0" /> },
  { label: "Performance", icon: <BarChart3 className="h-4 w-4 shrink-0" /> },
  { label: "Leaderboard", icon: <Trophy className="h-4 w-4 shrink-0" /> },
];

export default async function JudgeDashboardLayout({ children }: { children: React.ReactNode }) {
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

  return (
    <DashboardShell roleLabel="Judge" navItems={NAV_ITEMS}>
      {children}
    </DashboardShell>
  );
}
