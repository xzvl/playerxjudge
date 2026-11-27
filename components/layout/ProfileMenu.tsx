"use client";

import Link from "next/link";
import { ChevronDown, LayoutDashboard, LogOut, Settings, UserRound } from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  // The player's main community (profiles.community_id), for the mobile
  // nav's "Community/Individual" line — null shows "Individual".
  communityName: string | null;
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
          className="tap group flex h-10 items-center gap-2 rounded-[3px] p-0.5 pr-1.5 transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          aria-label="Open account menu"
        >
          <Avatar className="chamfer-sm h-8 w-8 rounded-none border-0 ring-1 ring-primary/50">
            {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
            <AvatarFallback className="rounded-none">{initials || <UserRound className="h-4 w-4" />}</AvatarFallback>
          </Avatar>
          <ChevronDown className="h-3.5 w-3.5 text-on-surface/40 transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="w-72 border-primary/30 p-0">
        <div className="relative overflow-hidden border-b border-outline-variant/25 bg-gradient-to-br from-primary/20 to-transparent px-4 py-4">
          <div className="flex items-center gap-3">
            <Avatar className="chamfer-sm h-12 w-12 rounded-none border-0 ring-1 ring-primary/60">
              {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
              <AvatarFallback className="rounded-none">{initials || <UserRound className="h-4 w-4" />}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold uppercase leading-none tracking-[0.05em] text-on-surface">
                {user.displayName}
              </p>
              <p className="mt-1.5 truncate text-xs font-medium uppercase tracking-[0.1em] text-on-surface/55">
                {user.communityName ?? "Individual"}
                {user.isOrganizer ? " · Organizer" : ""}
              </p>
              {user.email ? <p className="mt-0.5 truncate text-xs text-on-surface/40">{user.email}</p> : null}
            </div>
          </div>
        </div>
        <div className="p-1.5">
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/account" className="flex items-center gap-2.5 font-display font-semibold uppercase tracking-[0.06em]">
              <LayoutDashboard className="h-4 w-4 text-primary" /> Dashboard
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/account/settings" className="flex items-center gap-2.5 font-display font-semibold uppercase tracking-[0.06em]">
              <Settings className="h-4 w-4 text-primary" /> Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer gap-2.5 font-display font-semibold uppercase tracking-[0.06em] text-destructive focus:text-destructive"
            onSelect={() => void signOut()}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
