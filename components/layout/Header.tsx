"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  Link2,
  type LucideIcon,
} from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { HeaderSearch } from "@/components/layout/HeaderSearch";
import { ProfileMenu } from "@/components/layout/ProfileMenu";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import type { NavUser } from "@/components/layout/ProfileMenu";
import { isAccountRoute, isBackendRoute, isTournamentConsoleRoute } from "@/lib/routes";
import type { NavLink } from "@/lib/site-content/schema";
import { cn } from "@/lib/utils";

// Known destinations keep their icon in the menu; any other link from
// /backend/content gets a generic one.
const ICONS_BY_HREF: Record<string, LucideIcon> = {
  "/": Home,
  "/account": LayoutDashboard,
  "/tournaments": Swords,
  "/communities": Users2,
  "/calendar": CalendarDays,
  "/leaderboard": Trophy,
  "/rules": BookOpenCheck,
};

// Always at the top of the phone menu, ahead of the managed links.
const FIXED_MENU_ITEMS: NavLink[] = [
  { id: "home", label: "Home", href: "/", target: "_self" },
  { id: "dashboard", label: "Dashboard", href: "/account", target: "_self" },
];

const isExternal = (href: string) => /^(https?:|mailto:|tel:)/i.test(href);

function isActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

const menuLinkClass =
  "tap flex h-12 items-center gap-3 rounded-[3px] px-3 font-display text-lg font-medium uppercase tracking-[0.05em] text-on-surface/75 transition-colors hover:bg-surface-container hover:text-on-surface";

export function Header({
  user,
  notificationCount = 0,
  links,
}: {
  user: NavUser | null;
  notificationCount?: number;
  // Main navigation, managed in /backend/content (Header).
  links: NavLink[];
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The player view, judge console, and every /account or /backend page
  // build their own header/shell (PlayerViewShell, JudgeConsole,
  // DashboardShell), so the site-wide header stays out of the way there.
  if (isTournamentConsoleRoute(pathname) || isAccountRoute(pathname) || isBackendRoute(pathname)) return null;

  const close = () => setMobileOpen(false);
  const menuItems = [...FIXED_MENU_ITEMS, ...links.filter((l) => !FIXED_MENU_ITEMS.some((f) => f.href === l.href))];

  return (
    <header
      className={cn(
        "pt-safe sticky top-0 z-40 border-b transition-colors duration-200",
        scrolled
          ? "border-outline-variant/30 bg-background/90 shadow-[0_8px_24px_-16px_rgb(0_0_0/0.6)] backdrop-blur-xl"
          : "border-outline-variant/15 bg-background/60 backdrop-blur-md"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent transition-opacity",
          scrolled ? "opacity-100" : "opacity-0"
        )}
      />
      <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-2 px-3 md:px-6 lg:h-[68px] lg:gap-6">
        {/* Brand */}
        <Link href="/" aria-label="PlayerXJudge home" className="tap shrink-0 pr-1">
          <BrandLogo width={136} height={15} />
        </Link>

        {/* Primary navigation (desktop) */}
        <nav aria-label="Main" className="hidden items-center lg:flex">
          {links.map(({ id, label, href, target }) => {
            const active = !isExternal(href) && isActive(href, pathname);
            return (
              <Link
                key={id}
                href={href}
                target={target}
                rel={target === "_blank" ? "noopener noreferrer" : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative px-3.5 py-2 font-display text-[17px] font-medium uppercase tracking-[0.07em] transition-colors",
                  active ? "text-on-surface" : "text-on-surface/55 hover:text-on-surface"
                )}
              >
                {label}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-3.5 -bottom-[13px] h-[2px] origin-left bg-primary shadow-[0_0_10px_2px_rgb(var(--m3-primary)/0.8)] transition-transform duration-200",
                    active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-50"
                  )}
                />
              </Link>
            );
          })}
        </nav>

        {/* Search: fills the middle on desktop, icon on phones */}
        <div className="ml-auto hidden w-full max-w-xs lg:block xl:max-w-sm">
          <HeaderSearch variant="pill" />
        </div>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <HeaderSearch variant="icon" className="lg:hidden" />

          {user?.isOrganizer ? (
            <Button asChild size="sm" className="mr-1 hidden lg:inline-flex" tooltip="Set up a new tournament">
              <Link href="/account/organizer/tournament/new">
                <Plus /> Add tournament
              </Link>
            </Button>
          ) : null}

          <ThemeToggle className="hidden sm:inline-flex" />
          <NotificationsBell count={user ? notificationCount : 0} enabled={!!user} />

          {/* Desktop account area */}
          <div className="ml-1 hidden items-center gap-2 lg:flex">
            {user ? (
              <ProfileMenu user={user} />
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/register">Join free</Link>
                </Button>
              </>
            )}
          </div>

          {/* Phones/tablets: avatar-or-menu button opens the full menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="pt-safe pb-safe flex w-[88%] max-w-sm flex-col gap-3 overflow-y-auto border-l border-primary/40"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>

              {user ? (
                <Link
                  href="/account"
                  onClick={close}
                  className="flex items-center gap-3 border-b border-outline-variant/25 pb-4 pr-10"
                >
                  <Avatar className="chamfer-sm h-11 w-11 rounded-none border-0 ring-1 ring-primary/50">
                    {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
                    <AvatarFallback className="rounded-none">
                      <UserRound className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-display text-xl font-semibold uppercase leading-none tracking-[0.04em] text-on-surface">
                      {user.displayName}
                    </p>
                    <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.1em] text-on-surface/45">
                      {user.communityName ?? "Individual"} · Open dashboard
                    </p>
                  </div>
                </Link>
              ) : (
                <div className="border-b border-outline-variant/25 pb-4 pr-10">
                  <Link href="/" onClick={close} aria-label="PlayerXJudge home">
                    <BrandLogo width={128} height={14} />
                  </Link>
                </div>
              )}

              <nav aria-label="Site" className="flex flex-1 flex-col gap-px">
                {menuItems.map(({ id, label, href, target }) => {
                  const Icon = ICONS_BY_HREF[href] ?? Link2;
                  const active = !isExternal(href) && isActive(href, pathname);
                  return (
                    <Link
                      key={id}
                      href={href}
                      target={target}
                      rel={target === "_blank" ? "noopener noreferrer" : undefined}
                      onClick={close}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        menuLinkClass,
                        active && "bg-gradient-to-r from-primary/20 to-transparent text-on-surface"
                      )}
                    >
                      <Icon className={cn("h-5 w-5 shrink-0", active ? "text-primary" : "text-on-surface/50")} aria-hidden="true" />
                      {label}
                    </Link>
                  );
                })}
              </nav>

              {user?.isOrganizer ? (
                <Button asChild size="lg" className="w-full">
                  <Link href="/account/organizer/tournament/new" onClick={close}>
                    <Plus /> Add tournament
                  </Link>
                </Button>
              ) : null}

              {!user ? (
                <div className="chamfer-sm border border-primary/30 bg-gradient-to-br from-primary/15 to-transparent p-4">
                  <p className="font-display text-lg font-semibold uppercase tracking-[0.05em]">Create a free account</p>
                  <p className="mt-1 text-xs text-on-surface/55">
                    Track your player stats, build your Beyblade decks, and stay updated on tournaments near you.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button asChild size="sm" className="flex-1">
                      <Link href="/register" onClick={close}>
                        <UserPlus /> Join free
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <Link href="/login" onClick={close}>
                        <LogIn /> Sign in
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-2 border-t border-outline-variant/25 pt-3">
                {user ? (
                  <div className="flex gap-1">
                    <Link href="/account/settings" onClick={close} className={cn(menuLinkClass, "h-11 text-base")}>
                      <Settings className="h-4 w-4 shrink-0 text-on-surface/50" aria-hidden="true" /> Settings
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        void signOut();
                      }}
                      className={cn(menuLinkClass, "h-11 text-base")}
                    >
                      <LogOut className="h-4 w-4 shrink-0 text-on-surface/50" aria-hidden="true" /> Sign out
                    </button>
                  </div>
                ) : (
                  <span />
                )}
                <ThemeToggle />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
