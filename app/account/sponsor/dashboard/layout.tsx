import { redirect } from "next/navigation";
import { BarChart3, Eye, LayoutDashboard, MousePointerClick, Percent, Receipt, Trophy, Users2 } from "lucide-react";

import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/DashboardShell";
import { RoleApplicationGate } from "@/components/dashboard/RoleApplicationGate";
import { getCurrentUser, getCurrentUserRoles } from "@/lib/supabase/get-user";

const NAV_ITEMS: DashboardNavItem[] = [
  { label: "Overview", href: "/account/sponsor/dashboard", icon: <LayoutDashboard className="h-4 w-4 shrink-0" /> },
  { label: "Campaign Analytics", icon: <BarChart3 className="h-4 w-4 shrink-0" /> },
  { label: "Communities Sponsored", icon: <Users2 className="h-4 w-4 shrink-0" /> },
  { label: "Tournament Sponsorships", icon: <Trophy className="h-4 w-4 shrink-0" /> },
  { label: "Clicks", icon: <MousePointerClick className="h-4 w-4 shrink-0" /> },
  { label: "Views", icon: <Eye className="h-4 w-4 shrink-0" /> },
  { label: "CTR", icon: <Percent className="h-4 w-4 shrink-0" /> },
  { label: "Invoices", icon: <Receipt className="h-4 w-4 shrink-0" /> },
];

export default async function SponsorDashboardLayout({ children }: { children: React.ReactNode }) {
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

  return (
    <DashboardShell roleLabel="Sponsor" navItems={NAV_ITEMS}>
      {children}
    </DashboardShell>
  );
}
