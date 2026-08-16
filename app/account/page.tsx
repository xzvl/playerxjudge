import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Gavel, Handshake, LayoutDashboard, Trophy } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ACCOUNT_SETTINGS_NAV_ITEM, getAccountNavItems } from "@/components/dashboard/accountNavItems";
import {
  buildNavUser,
  getCurrentUser,
  getCurrentUserCommunityName,
  getCurrentUserRoles,
  getUnreadNotificationCount,
} from "@/lib/supabase/get-user";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

const ROLE_DASHBOARDS = [
  {
    role: "player" as const,
    label: "Player Dashboard",
    description: "Track your tournament activity, match history, and achievements.",
    href: "/account/player/dashboard",
    icon: Trophy,
  },
  {
    role: "judge" as const,
    label: "Judge Dashboard",
    description: "Manage assigned tournaments and score matches.",
    href: "/account/judge/dashboard",
    icon: Gavel,
  },
  {
    role: "organizer" as const,
    label: "Organizer Dashboard",
    description: "Run tournaments, manage communities, and track revenue.",
    href: "/account/organizer/dashboard",
    icon: LayoutDashboard,
  },
  {
    role: "sponsor" as const,
    label: "Sponsor Dashboard",
    description: "Track your sponsorships and campaign performance.",
    href: "/account/sponsor/dashboard",
    icon: Handshake,
  },
];

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account");

  const roles = await getCurrentUserRoles();
  const approvedRoles = new Set(roles.filter((r) => r.status === "approved").map((r) => r.role));
  approvedRoles.add("player");

  const dashboards = ROLE_DASHBOARDS.filter((d) => approvedRoles.has(d.role));

  if (dashboards.length === 1) {
    redirect(dashboards[0].href);
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
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <p className="label-mono text-primary">Account</p>
          <h1 className="heading mt-2 text-3xl">Your Dashboards</h1>
          <p className="mt-2 text-sm text-on-surface/60">Pick a dashboard to continue.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {dashboards.map((dashboard) => (
            <Card key={dashboard.role}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <dashboard.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  {dashboard.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-on-surface/60">{dashboard.description}</p>
                <Button asChild className="w-full" tooltip={`Open your ${dashboard.label}`}>
                  <Link href={dashboard.href}>Go to Dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
