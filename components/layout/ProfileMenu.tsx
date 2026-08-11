"use client";

import Link from "next/link";
import { LayoutDashboard, LogOut, Settings, UserRound } from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type NavUser = {
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  // Approved organizer role — gates the header's "Add Tournament" button
  // (see Header.tsx). Not just "has an organizer role" — a pending/rejected
  // application shouldn't see it either, matching
  // app/account/organizer/layout.tsx's own gate on the destination page.
  isOrganizer: boolean;
};

export function ProfileMenu({ user }: { user: NavUser | null }) {
  if (!user) {
    return (
      <div className="hidden items-center gap-2 md:flex">
        <Button asChild variant="ghost" size="sm" tooltip="Sign in to your account">
          <Link href="/login">Sign In</Link>
        </Button>
        <Button asChild size="sm" tooltip="Create a new account">
          <Link href="/register">Join</Link>
        </Button>
      </div>
    );
  }

  const initials = user.displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Open account menu"
        >
          <Avatar>
            {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
            <AvatarFallback>{initials || <UserRound className="h-4 w-4" />}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="normal-case tracking-normal text-on-surface">
          {user.displayName}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" /> Account Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <form action={signOut} className="w-full">
            <button type="submit" className="flex w-full items-center gap-2">
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
