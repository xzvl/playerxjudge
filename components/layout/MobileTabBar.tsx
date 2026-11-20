"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Swords, Trophy, UserRound, Users2, type LucideIcon } from "lucide-react";

import { isAccountRoute, isBackendRoute, isTournamentConsoleRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";

// App-style bottom navigation for phones and tablets (below lg) on the
// public site. /account, /backend and the tournament consoles carry their
// own bars, so it stays out of their way.
export function MobileTabBar({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname() ?? "/";
  if (isAccountRoute(pathname) || isBackendRoute(pathname) || isTournamentConsoleRoute(pathname)) return null;

  const tabs: { label: string; href: string; Icon: LucideIcon; match: (p: string) => boolean }[] = [
    { label: "Home", href: "/", Icon: Home, match: (p) => p === "/" },
    { label: "Events", href: "/tournaments", Icon: Swords, match: (p) => p.startsWith("/tournaments") || p.startsWith("/calendar") },
    { label: "Clubs", href: "/communities", Icon: Users2, match: (p) => p.startsWith("/communities") || p.startsWith("/map") },
    { label: "Ranks", href: "/leaderboard", Icon: Trophy, match: (p) => p.startsWith("/leaderboard") },
    {
      label: signedIn ? "Me" : "Sign in",
      href: signedIn ? "/account" : "/login",
      Icon: UserRound,
      match: (p) => p.startsWith("/login") || p.startsWith("/register"),
    },
  ];

  return (
    <nav
      aria-label="Primary"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant/25 bg-background/85 backdrop-blur-xl lg:hidden"
    >
      <ul className="mx-auto grid h-14 max-w-xl grid-cols-5">
        {tabs.map(({ label, href, Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={label}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="tap group relative flex h-full flex-col items-center justify-center gap-0.5"
              >
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-5 top-0 h-[2px] bg-primary shadow-[0_0_12px_2px_rgb(var(--m3-primary)/0.7)]"
                  />
                ) : null}
                <Icon
                  className={cn(
                    "h-[22px] w-[22px] transition-all",
                    active ? "-translate-y-px text-primary drop-shadow-[0_0_8px_rgb(var(--m3-primary)/0.6)]" : "text-on-surface/50"
                  )}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    "font-mono text-[9.5px] font-medium uppercase tracking-[0.12em]",
                    active ? "text-on-surface" : "text-on-surface/45"
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
