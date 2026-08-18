import {
  BadgeCheck,
  BarChart3,
  Bell,
  Disc3,
  DollarSign,
  Download,
  FileText,
  Gavel,
  Handshake,
  Heart,
  History,
  Layers,
  LayoutDashboard,
  ListChecks,
  Settings,
  Star,
  Swords,
  Trophy,
  Users,
  Users2,
} from "lucide-react";

// Sponsor "Tournament Sponsor" and Judge's own children below reuse
// NavList's built-in behavior for a child with no `href` and no nested
// `children` — it renders as a disabled "Soon" row, so a placeholder entry
// needs nothing beyond an icon + label.

import type { DashboardNavItem } from "@/components/dashboard/DashboardShell";
import type { AppRole, ProfileRole } from "@/lib/types/database";

const PLAYER_DASHBOARD_SUB_ITEMS: DashboardNavItem[] = [
  { label: "Overview", href: "/account/player/dashboard", icon: <LayoutDashboard className="h-4 w-4 shrink-0" /> },
  {
    label: "Upcoming Tournaments",
    href: "/account/player/upcoming-tournaments",
    icon: <Trophy className="h-4 w-4 shrink-0" />,
  },
  {
    label: "Registered Tournaments",
    href: "/account/player/registered-tournaments",
    icon: <ListChecks className="h-4 w-4 shrink-0" />,
  },
  {
    label: "Match History",
    href: "/account/player/match-history",
    icon: <History className="h-4 w-4 shrink-0" />,
  },
  {
    label: "Achievements",
    href: "/account/player/achievements",
    icon: <Star className="h-4 w-4 shrink-0" />,
  },
  {
    label: "Statistics",
    href: "/account/player/statistics",
    icon: <BarChart3 className="h-4 w-4 shrink-0" />,
  },
  {
    label: "Favorite Communities",
    href: "/account/player/favorite-communities",
    icon: <Heart className="h-4 w-4 shrink-0" />,
  },
  {
    label: "Notifications",
    href: "/account/player/notifications",
    icon: <Bell className="h-4 w-4 shrink-0" />,
  },
];

const ORGANIZER_DASHBOARD_SUB_ITEMS: DashboardNavItem[] = [
  { label: "Overview", href: "/account/organizer/dashboard", icon: <LayoutDashboard className="h-4 w-4 shrink-0" /> },
  {
    label: "Analytics",
    href: "/account/organizer/analytics",
    icon: <BarChart3 className="h-4 w-4 shrink-0" />,
  },
  {
    label: "Revenue",
    href: "/account/organizer/revenue",
    icon: <DollarSign className="h-4 w-4 shrink-0" />,
  },
  {
    label: "Tournament Management",
    href: "/account/organizer/tournament",
    icon: <Trophy className="h-4 w-4 shrink-0" />,
  },
  {
    label: "Community Management",
    href: "/account/organizer/community",
    icon: <Users2 className="h-4 w-4 shrink-0" />,
  },
  {
    label: "Reports",
    href: "/account/organizer/reports",
    icon: <FileText className="h-4 w-4 shrink-0" />,
  },
  {
    label: "Participants",
    href: "/account/organizer/participants",
    icon: <Users className="h-4 w-4 shrink-0" />,
  },
  {
    label: "Export CSV",
    href: "/account/organizer/export-csv",
    icon: <Download className="h-4 w-4 shrink-0" />,
  },
];

const JUDGE_DASHBOARD_SUB_ITEMS: DashboardNavItem[] = [
  { label: "Overview", href: "/account/judge/dashboard", icon: <LayoutDashboard className="h-4 w-4 shrink-0" /> },
  {
    label: "Assigned Tournaments",
    href: "/account/judge/assigned-tournaments",
    icon: <ListChecks className="h-4 w-4 shrink-0" />,
  },
  {
    label: "Match History",
    href: "/account/judge/match-history",
    icon: <History className="h-4 w-4 shrink-0" />,
  },
  {
    label: "Judge Profile",
    href: "/account/judge/profile",
    icon: <BadgeCheck className="h-4 w-4 shrink-0" />,
  },
];

const SPONSOR_DASHBOARD_SUB_ITEMS: DashboardNavItem[] = [
  { label: "Overview", href: "/account/sponsor/dashboard", icon: <LayoutDashboard className="h-4 w-4 shrink-0" /> },
  { label: "Tournament Sponsor", icon: <Trophy className="h-4 w-4 shrink-0" /> },
];

// Not gated by role like the four above — every signed-in account can save
// combos/build a deck regardless of player/judge/organizer/sponsor status,
// so this is appended unconditionally in getAccountNavItems below.
const BEYBLADE_DASHBOARD_SUB_ITEMS: DashboardNavItem[] = [
  { label: "Overview", href: "/account/beyblade/dashboard", icon: <LayoutDashboard className="h-4 w-4 shrink-0" /> },
  { label: "Build Your Deck", href: "/account/beyblade/deck", icon: <Layers className="h-4 w-4 shrink-0" /> },
  { label: "Beyblade Combo", href: "/account/beyblade/combos", icon: <Swords className="h-4 w-4 shrink-0" /> },
];

const BEYBLADE_DASHBOARD_NAV_ITEM: DashboardNavItem = {
  label: "Beyblade Dashboard",
  icon: <Disc3 className="h-4 w-4 shrink-0" />,
  children: BEYBLADE_DASHBOARD_SUB_ITEMS,
};

// Shown only to accounts without an approved judge role (see
// getAccountNavItems below) — links to the in-account BeyZ ID + apply flow
// at /account/judge/apply, distinct from the public /become/judge page.
const APPLY_JUDGE_NAV_ITEM: DashboardNavItem = {
  label: "Apply Judge",
  href: "/account/judge/apply",
  icon: <Gavel className="h-4 w-4 shrink-0" />,
};

const ROLE_NAV_ITEMS: { role: AppRole; item: DashboardNavItem }[] = [
  {
    role: "player",
    item: {
      label: "Player Dashboard",
      icon: <Trophy className="h-4 w-4 shrink-0" />,
      children: PLAYER_DASHBOARD_SUB_ITEMS,
    },
  },
  {
    role: "judge",
    item: {
      label: "Judge Dashboard",
      icon: <Gavel className="h-4 w-4 shrink-0" />,
      children: JUDGE_DASHBOARD_SUB_ITEMS,
    },
  },
  {
    role: "organizer",
    item: {
      label: "Organizer Dashboard",
      icon: <LayoutDashboard className="h-4 w-4 shrink-0" />,
      children: ORGANIZER_DASHBOARD_SUB_ITEMS,
    },
  },
  {
    role: "sponsor",
    item: {
      label: "Sponsor Dashboard",
      icon: <Handshake className="h-4 w-4 shrink-0" />,
      children: SPONSOR_DASHBOARD_SUB_ITEMS,
    },
  },
];

export const ACCOUNT_SETTINGS_NAV_ITEM: DashboardNavItem = {
  label: "Account Settings",
  href: "/account/settings",
  icon: <Settings className="h-4 w-4 shrink-0" />,
};

export function getAccountNavItems(roles: ProfileRole[]): DashboardNavItem[] {
  const approvedRoles = new Set(roles.filter((r) => r.status === "approved").map((r) => r.role));
  approvedRoles.add("player");

  // Player Dashboard is always present (every account has "player" added
  // above) and always first, since it's ROLE_NAV_ITEMS' first entry — so
  // Beyblade Dashboard can always slot in as the 2nd item, directly under
  // it, regardless of which other role dashboards (Judge/Organizer/
  // Sponsor) also show up beneath.
  const [playerItem, ...otherRoleItems] = ROLE_NAV_ITEMS.filter(({ role }) => approvedRoles.has(role)).map(({ item }) => item);
  const items = [playerItem, BEYBLADE_DASHBOARD_NAV_ITEM, ...otherRoleItems];

  // Not an approved judge yet — offer the apply link right under Beyblade
  // Dashboard rather than making them find /become/judge.
  if (!approvedRoles.has("judge")) items.splice(2, 0, APPLY_JUDGE_NAV_ITEM);

  return items;
}
