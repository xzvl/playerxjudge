"use client";

import Link from "next/link";
import { LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { ProfileMenu, type NavUser } from "@/components/layout/ProfileMenu";

// The player view's own header actions — stands in for the site-wide
// Header's right side (see Header.tsx, which hides itself on this route).
// Always shows the notification bell; signed-out visitors get Sign In/Join,
// signed-in ones get their avatar -> account dropdown via ProfileMenu. Unlike
// the global Header, everything here stays visible at every breakpoint —
// this page has no separate mobile-menu sheet to fall back on.
export function PlayerViewHeaderActions({ user, notificationCount = 0 }: { user: NavUser | null; notificationCount?: number }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <NotificationsBell count={user ? notificationCount : 0} enabled={!!user} />
      {user ? (
        <ProfileMenu user={user} />
      ) : (
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="gap-1.5" tooltip="Sign in to your account">
            <Link href="/login">
              <LogIn className="h-3.5 w-3.5" /> Sign In
            </Link>
          </Button>
          <Button asChild size="sm" tooltip="Create a new account">
            <Link href="/register">Join</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
