import { redirect } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  ClipboardList,
  Disc3,
  Gavel,
  Handshake,
  HelpCircle,
  LayoutDashboard,
  ListChecks,
  ScrollText,
  ShieldCheck,
  Trophy,
  Users,
  Users2,
} from "lucide-react";

import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/DashboardShell";
import {
  buildNavUser,
  getCurrentProfile,
  getCurrentUser,
  getCurrentUserCommunityName,
  getCurrentUserRoles,
  getUnreadNotificationCount,
  isStaffProfile,
} from "@/lib/supabase/get-user";

const BACKEND_NAV_ITEMS: DashboardNavItem[] = [
  { label: "Overview", href: "/backend/dashboard", icon: <LayoutDashboard className="h-4 w-4 shrink-0" /> },
  { label: "Role Applications", href: "/backend/role-applications", icon: <ClipboardList className="h-4 w-4 shrink-0" /> },
  { label: "Organizers", href: "/backend/organizers", icon: <Users2 className="h-4 w-4 shrink-0" /> },
  { label: "Judges", href: "/backend/judges", icon: <Gavel className="h-4 w-4 shrink-0" /> },
  { label: "Players", href: "/backend/players", icon: <Users className="h-4 w-4 shrink-0" /> },
  { label: "Communities", href: "/backend/communities", icon: <Building2 className="h-4 w-4 shrink-0" /> },
  { label: "Sponsors", href: "/backend/sponsors", icon: <Handshake className="h-4 w-4 shrink-0" /> },
  { label: "Tournaments", href: "/backend/tournaments", icon: <Trophy className="h-4 w-4 shrink-0" /> },
  { label: "Participants", href: "/backend/participants", icon: <ListChecks className="h-4 w-4 shrink-0" /> },
  { label: "Beyblades", href: "/backend/beyblades", icon: <Disc3 className="h-4 w-4 shrink-0" /> },
  { label: "FAQs", href: "/backend/faqs", icon: <HelpCircle className="h-4 w-4 shrink-0" /> },
  { label: "Privacy Policy", href: "/backend/privacy-policy", icon: <ShieldCheck className="h-4 w-4 shrink-0" /> },
  { label: "Terms & Conditions", href: "/backend/terms", icon: <ScrollText className="h-4 w-4 shrink-0" /> },
  { label: "How to Use", href: "/backend/how-to-use", icon: <BadgeCheck className="h-4 w-4 shrink-0" /> },
];

// No self-service application here, same as the admin surfaces this
// retires — staff access (admin/super_admin, or an approved `manager`
// profile_roles row) is granted directly, never requested through the app.
export default async function BackendLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/backend");

  const [profile, roles] = await Promise.all([getCurrentProfile(), getCurrentUserRoles()]);
  if (!isStaffProfile(profile, roles)) redirect("/");

  // Passing `user` switches DashboardShell into the same "standalone" shell
  // /account uses (full-height branded sidebar, its own search/profile
  // header) — the global site Header/Footer hide themselves on /backend
  // for the same reason they do on /account (see Header.tsx / Footer.tsx
  // and isBackendRoute).
  const [notificationCount, communityName] = await Promise.all([getUnreadNotificationCount(), getCurrentUserCommunityName()]);
  const navUser = buildNavUser(user, roles, communityName);

  return (
    <DashboardShell roleLabel="Backend" navItems={BACKEND_NAV_ITEMS} user={navUser} notificationCount={notificationCount}>
      {children}
    </DashboardShell>
  );
}
