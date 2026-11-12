"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  BookOpenCheck,
  CalendarDays,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Plus,
  Settings,
  Swords,
  Trophy,
  UserPlus,
  UserRound,
  Users2,
} from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { SearchBar } from "@/components/layout/SearchBar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import type { NavUser } from "@/components/layout/ProfileMenu";
import { isAccountRoute, isBackendRoute, isTournamentConsoleRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Home", href: "/", Icon: Home },
  { label: "Dashboard", href: "/account", Icon: LayoutDashboard },
  { label: "Tournaments", href: "/tournaments", Icon: Swords },
  { label: "Communities", href: "/communities", Icon: Users2 },
  { label: "Calendar", href: "/calendar", Icon: CalendarDays },
  { label: "Leaderboard", href: "/leaderboard", Icon: Trophy },
  { label: "Beyblade X Rules", href: "/rules", Icon: BookOpenCheck },
];

// The subset shown inline on wide screens; everything stays in the menu.
const DESKTOP_NAV = NAV_ITEMS.filter((item) => ["/tournaments", "/communities", "/calendar", "/leaderboard", "/rules"].includes(item.href));

function isActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

const menuLinkClass =
  "flex h-9 items-center gap-2.5 rounded-md px-2 text-[13px] text-on-surface/75 transition-colors hover:bg-surface-container hover:text-on-surface";

export function Header({ user, notificationCount = 0 }: { user: NavUser | null; notificationCount?: number }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname() ?? "/";

  // The player view, judge console, and every /account or /backend page
  // build their own header/shell (PlayerViewShell, JudgeConsole,
  // DashboardShell), so the site-wide header stays out of the way there.
  if (isTournamentConsoleRoute(pathname) || isAccountRoute(pathname) || isBackendRoute(pathname)) return null;

  const close = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-outline-variant/20 bg-background">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-4 px-4 md:px-6">
        <Link href="/" aria-label="PlayerXJudge home" className="shrink-0">
          <BrandLogo width={136} height={15} />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex">
          {DESKTOP_NAV.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href, pathname) ? "page" : undefined}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                isActive(href, pathname)
                  ? "font-medium text-on-surface"
                  : "text-on-surface/60 hover:bg-surface-container hover:text-on-surface"
              )}
            >
              {label === "Beyblade X Rules" ? "Rules" : label}
            </Link>
          ))}
        </nav>

        <SearchBar className="ml-auto hidden w-64 md:block" />

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          {user?.isOrganizer ? (
            <Button asChild size="sm" className="hidden sm:inline-flex" tooltip="Set up a new tournament">
              <Link href="/account/organizer/tournament/new">
                <Plus /> Add tournament
              </Link>
            </Button>
          ) : !user ? (
            <div className="hidden items-center gap-1 sm:flex">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Join</Link>
              </Button>
            </div>
          ) : (
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link href="/account">
                <LayoutDashboard /> Dashboard
              </Link>
            </Button>
          )}
          <ThemeToggle />
          <NotificationsBell count={user ? notificationCount : 0} enabled={!!user} />

          {/* One menu at every width: profile, full navigation, account actions. */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-72 flex-col gap-3 overflow-y-auto">
              <SheetHeader className="sr-only">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>

              {user ? (
                <div className="flex items-center gap-2.5 border-b border-outline-variant/20 pb-3 pr-8">
                  <Avatar className="h-8 w-8">
                    {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
                    <AvatarFallback>
                      <UserRound className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-on-surface">{user.displayName}</p>
                    <p className="truncate text-xs text-on-surface/45">{user.communityName ?? "Individual"}</p>
                  </div>
                </div>
              ) : (
                <Link href="/" onClick={close} aria-label="PlayerXJudge home" className="border-b border-outline-variant/20 pb-3">
                  <BrandLogo width={128} height={14} />
                </Link>
              )}

              <nav aria-label="Site" className="flex flex-1 flex-col gap-px">
                {NAV_ITEMS.map(({ label, href, Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={close}
                    aria-current={isActive(href, pathname) ? "page" : undefined}
                    className={cn(menuLinkClass, isActive(href, pathname) && "bg-surface-container-high font-medium text-on-surface")}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-on-surface/50" aria-hidden="true" />
                    {label}
                  </Link>
                ))}
              </nav>

              {!user ? (
                <div className="rounded-md border border-outline-variant/25 bg-surface-container-low p-3">
                  <p className="text-[13px] font-medium">Create a free account</p>
                  <p className="mt-1 text-xs text-on-surface/55">
                    Track your player stats, build your Beyblade decks, and stay updated on tournaments near you.
                  </p>
                </div>
              ) : null}

              <div className="flex flex-col gap-px border-t border-outline-variant/20 pt-3">
                {user ? (
                  <>
                    <Link href="/account/settings" onClick={close} className={menuLinkClass}>
                      <Settings className="h-4 w-4 shrink-0 text-on-surface/50" aria-hidden="true" /> Settings
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        void signOut();
                      }}
                      className={cn(menuLinkClass, "w-full text-left")}
                    >
                      <LogOut className="h-4 w-4 shrink-0 text-on-surface/50" aria-hidden="true" /> Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/register" onClick={close} className={menuLinkClass}>
                      <UserPlus className="h-4 w-4 shrink-0 text-on-surface/50" aria-hidden="true" /> Join now
                    </Link>
                    <Link href="/login" onClick={close} className={menuLinkClass}>
                      <LogIn className="h-4 w-4 shrink-0 text-on-surface/50" aria-hidden="true" /> Sign in
                    </Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
