"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/layout/BrandLogo";
import {
  BookOpenCheck,
  CalendarDays,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
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
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import type { NavUser } from "@/components/layout/ProfileMenu";

// Same list, same order as the global Header's own mobile menu (Header.tsx)
// — kept as its own literal copy rather than a shared import so either one
// can drift independently later, but today they're deliberately identical:
// this page's hamburger is meant to be the *same* main navigation, just
// reachable from a page whose own header stands in for the site-wide
// Header entirely (see Header.tsx, which hides itself on this route).
const NAV_ITEMS = [
  { label: "Home", href: "/", Icon: Home },
  { label: "Dashboard", href: "/account", Icon: LayoutDashboard },
  { label: "Tournaments", href: "/tournaments", Icon: Swords },
  { label: "Communities", href: "/communities", Icon: Users2 },
  { label: "Calendar", href: "/calendar", Icon: CalendarDays },
  { label: "Leaderboard", href: "/leaderboard", Icon: Trophy },
  { label: "Beyblade X Rules", href: "/rules", Icon: BookOpenCheck },
];

// The player view's own header actions — stands in for the site-wide
// Header's right side (see Header.tsx, which hides itself on this route).
// Theme toggle and notification bell stay inline at every breakpoint, same
// as the global Header. The profile menu (or Sign In/Join) is *always*
// behind the hamburger Sheet here, not just below `lg` — the same
// mobile-menu pattern Header.tsx uses on phones, full site nav (NAV_ITEMS)
// included, just without that header's search bar or "Add Tournament"
// button, which don't apply to this page's own shell. Unlike Header.tsx,
// it never switches to the inline avatar-dropdown ProfileMenu at wider
// widths — the hamburger is the one entry point at every breakpoint here.
export function PlayerViewHeaderActions({ user, notificationCount = 0 }: { user: NavUser | null; notificationCount?: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex shrink-0 items-center gap-2">
      {user ? (
        <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex" tooltip="Open your dashboard">
          <Link href="/account">
            <LayoutDashboard /> Dashboard
          </Link>
        </Button>
      ) : null}
      <ThemeToggle />
      <NotificationsBell count={user ? notificationCount : 0} enabled={!!user} />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="flex flex-col overflow-y-auto">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>

          {user ? (
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
                <AvatarFallback>
                  <UserRound className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-inter font-bold text-on-surface">{user.displayName}</p>
                <p className="label-mono text-xs text-on-surface/50">{user.communityName ?? "Individual"}</p>
              </div>
            </div>
          ) : (
            <Link href="/" onClick={() => setOpen(false)} className="heading text-base">
              <BrandLogo width={136} height={15} />
            </Link>
          )}

          <div className="border-t border-outline-variant/20" />

          <nav aria-label="Mobile" className="flex flex-1 flex-col gap-1">
            {NAV_ITEMS.map(({ label, href, Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 py-2.5 text-sm text-on-surface/70 transition-colors hover:text-primary"
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="border-t border-outline-variant/20" />

          {!user ? (
            <div className="border border-primary bg-primary/10 p-4">
              <p className="heading text-base text-primary">Sign Up</p>
              <p className="mt-1.5 text-sm text-on-surface/70">
                Track your player stats, build your Beyblade decks, and stay updated on tournaments near you.
              </p>
            </div>
          ) : null}

          <div className="mt-auto flex flex-col gap-1 pt-4">
            {user ? (
              <>
                <Link
                  href="/account/settings"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 py-2.5 text-sm text-on-surface/70 transition-colors hover:text-primary"
                >
                  <Settings className="h-4 w-4 shrink-0" aria-hidden="true" /> Settings
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    void signOut();
                  }}
                  className="flex items-center gap-3 py-2.5 text-left text-sm text-on-surface/70 transition-colors hover:text-primary"
                >
                  <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" /> Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/register"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 py-2.5 text-sm text-on-surface/70 transition-colors hover:text-primary"
                >
                  <UserPlus className="h-4 w-4 shrink-0" aria-hidden="true" /> Join Now
                </Link>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 py-2.5 text-sm text-on-surface/70 transition-colors hover:text-primary"
                >
                  <LogIn className="h-4 w-4 shrink-0" aria-hidden="true" /> Sign In
                </Link>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
