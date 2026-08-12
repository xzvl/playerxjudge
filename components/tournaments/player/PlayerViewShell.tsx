"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BarChart3, Swords, Trophy, UserRound } from "lucide-react";

import { PlayerViewHeaderActions } from "@/components/tournaments/player/PlayerViewHeaderActions";
import type { NavUser } from "@/components/layout/ProfileMenu";

// The player-view page's own app-shell: a full left <aside> nav on desktop
// (icon + title + subtitle, anchored to the page's own sections) that
// collapses into a fixed bottom bar (icon + title only — subtitle drops)
// below the 1024px/`lg` breakpoint. The site's global Header hides itself on
// this route (see Header.tsx) — the content header below carries its own
// right-side notification bell / sign-in-join / profile menu instead of
// stacking a second header on top of this page's own nav.
const NAV_ITEMS = [
  { id: "player", label: "Player", sub: "Current Stats", icon: UserRound },
  { id: "tournament", label: "Tournament", sub: "Stages and Standing", icon: Trophy },
  { id: "matches", label: "Matches", sub: "Upcoming / Recent Battle", icon: Swords },
  { id: "statistics", label: "Statistics", sub: "Your Finishes", icon: BarChart3 },
] as const;

export function PlayerViewShell({
  tournamentTitle,
  organizedBy,
  user,
  children,
}: {
  tournamentTitle: string;
  organizedBy: string;
  user: NavUser | null;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-[1440px]">
      <aside className="sticky top-0 hidden h-[calc(100vh)] w-64 shrink-0 flex-col border-r border-outline-variant/25 bg-surface-container-lowest lg:flex">
        <div className="p-4">
          <Link href="/" className="heading text-lg">
            Player<span className="text-primary">X</span>Judge
          </Link>
          <p className="label-mono mt-4 text-primary">Dashboard</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {NAV_ITEMS.map(({ id, label, sub, icon: Icon }) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex items-center gap-3 px-2 py-3 text-on-surface/70 transition-colors hover:bg-surface-container-high hover:text-on-surface"
            >
              <Icon className="h-5 w-5 shrink-0 text-on-surface/40" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-on-surface">{label}</span>
                <span className="label-mono block text-[10px] text-on-surface/40">{sub}</span>
              </span>
            </a>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-start justify-between gap-4 border-b border-outline-variant/25 px-4 py-5 md:px-8">
          <div className="min-w-0">
            <h1 className="heading truncate text-base sm:text-xl md:text-2xl">{tournamentTitle}</h1>
            <p className="mt-1 text-sm text-on-surface/50">Organized by {organizedBy}</p>
          </div>
          <PlayerViewHeaderActions user={user} />
        </header>

        <div className="px-4 py-8 pb-24 md:px-8 lg:pb-8">{children}</div>
      </div>

      <nav
        aria-label="Player view sections"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-outline-variant/25 bg-surface-container-lowest lg:hidden"
      >
        {NAV_ITEMS.slice(0, 2).map(({ id, label, icon: Icon }) => (
          <a
            key={id}
            href={`#${id}`}
            className="flex flex-1 flex-col items-center gap-1 py-2.5 text-on-surface/60 transition-colors hover:text-primary"
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span className="label-mono !text-[8px]">{label}</span>
          </a>
        ))}

        {/* Brand mark, dead center of the bar between Tournament and
            Matches — doubles as a link back home. */}
        <Link
          href="/"
          aria-label="PlayerXJudge home"
          className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-on-surface transition-colors hover:text-primary"
        >
          <span className="heading text-[11px] text-center leading-tight">
            Player<span className="text-primary block">X</span>Judge
          </span>
        </Link>

        {NAV_ITEMS.slice(2).map(({ id, label, icon: Icon }) => (
          <a
            key={id}
            href={`#${id}`}
            className="flex flex-1 flex-col items-center gap-1 py-2.5 text-on-surface/60 transition-colors hover:text-primary"
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span className="label-mono !text-[8px]">{label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
