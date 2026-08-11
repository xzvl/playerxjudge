import {
  BarChart3,
  Bell,
  CheckSquare,
  DollarSign,
  Download,
  FileText,
  Gavel,
  Handshake,
  Heart,
  History,
  LayoutDashboard,
  ListChecks,
  Settings,
  Star,
  Trophy,
  Users,
  Users2,
} from "lucide-react";

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
    label: "Check-in",
    href: "/account/organizer/check-in",
    icon: <CheckSquare className="h-4 w-4 shrink-0" />,
  },
  {
    label: "Export CSV",
    href: "/account/organizer/export-csv",
    icon: <Download className="h-4 w-4 shrink-0" />,
  },
];

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
    item: { label: "Judge Dashboard", href: "/account/judge/dashboard", icon: <Gavel className="h-4 w-4 shrink-0" /> },
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
    item: { label: "Sponsor Dashboard", href: "/account/sponsor/dashboard", icon: <Handshake className="h-4 w-4 shrink-0" /> },
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

  return ROLE_NAV_ITEMS.filter(({ role }) => approvedRoles.has(role)).map(({ item }) => item);
}
