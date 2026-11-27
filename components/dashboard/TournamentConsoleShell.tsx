import { BarChart3, Disc3, RefreshCw, Swords, Trash2, Trophy, UserRound } from "lucide-react";

import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/DashboardShell";
import { getShellData } from "@/lib/supabase/get-user";

const icon = "h-4 w-4 shrink-0";

function navFor(kind: "player" | "judge", slug: string): DashboardNavItem[] {
  if (kind === "player") {
    return [
      { label: "Player", href: "#player", icon: <UserRound className={icon} /> },
      { label: "Beyblade", href: "#current-deck", icon: <Disc3 className={icon} /> },
      { label: "Tournament", href: "#tournament", icon: <Trophy className={icon} /> },
      { label: "Matches", href: "#matches", icon: <Swords className={icon} /> },
    ];
  }
  return [
    { label: "Switch", event: "judge:switch", icon: <RefreshCw className={icon} /> },
    { label: "Clear", event: "judge:clear", icon: <Trash2 className={icon} /> },
    { label: "Player", href: `/tournaments/${slug}/player`, icon: <UserRound className={icon} /> },
    { label: "Tournament", href: `/tournaments/${slug}`, icon: <BarChart3 className={icon} /> },
  ];
}

function tabsFor(kind: "player" | "judge", slug: string): DashboardNavItem[] {
  const home: DashboardNavItem = { label: "Home", href: "/", brand: true, icon: null };
  const nav = navFor(kind, slug);
  return [...nav.slice(0, 2), home, ...nav.slice(2)];
}

// The /account sidebar and header, with this page's own menu. Signed-out
// visitors get it too (the player view is public); pages gate themselves.
export async function TournamentConsoleShell({
  kind,
  slug,
  children,
}: {
  kind: "player" | "judge";
  slug: string;
  children: React.ReactNode;
}) {
  const shell = await getShellData();
  return (
    <DashboardShell
      roleLabel={kind === "player" ? "Player" : "Judge"}
      navItems={navFor(kind, slug)}
      flush={kind === "judge"}
      mobileTabs={tabsFor(kind, slug)}
      user={shell?.navUser ?? null}
      notificationCount={shell?.notificationCount ?? 0}
    >
      {children}
    </DashboardShell>
  );
}
