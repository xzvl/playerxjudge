"use client";

import Link from "next/link";
import { LogIn, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { ProfileMenu, type NavUser } from "@/components/layout/ProfileMenu";

// The player view's own header actions — stands in for the site-wide
// Header's right side (see Header.tsx, which hides itself on this route).
// Always shows the notification bell; signed-out visitors get Sign In/Join,
// signed-in ones get their avatar -> account dropdown via ProfileMenu. Unlike
// the global Header, everything here stays visible at every breakpoint —
// this page has no separate mobile-menu sheet to fall back on. Below `lg`
// (the same breakpoint where the page's own left nav collapses into the
// bottom bar) header space is tight, so Sign In/Join shrink to icon-only
// buttons — their label comes back at `lg` and up.
export function PlayerViewHeaderActions({ user, notificationCount = 0 }: { user: NavUser | null; notificationCount?: number }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <ThemeToggle />
      <NotificationsBell count={user ? notificationCount : 0} enabled={!!user} />
      {user ? (
        <ProfileMenu user={user} />
      ) : (
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-9 gap-1.5 px-0 lg:w-auto lg:px-4"
            tooltip="Sign in to your account"
          >
            <Link href="/login">
              <LogIn className="h-3.5 w-3.5" /> <span className="hidden lg:inline">Sign In</span>
            </Link>
          </Button>
          <Button asChild size="sm" className="w-9 gap-1.5 px-0 lg:w-auto lg:px-4" tooltip="Create a new account">
            <Link href="/register">
              <UserPlus className="h-3.5 w-3.5" /> <span className="hidden lg:inline">Join</span>
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
