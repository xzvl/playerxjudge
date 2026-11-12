"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings, Trophy, Users } from "lucide-react";

import { cn } from "@/lib/utils";

export function TeamSubNav({ slug, isManager }: { slug: string; isManager: boolean }) {
  const pathname = usePathname() ?? "";
  const base = `/account/team/teams/${slug}`;
  const items = [
    { href: base, label: "Overview", icon: LayoutDashboard, exact: true },
    { href: `${base}/members`, label: "Members", icon: Users },
    { href: `${base}/leagues`, label: "Leagues", icon: Trophy },
    ...(isManager ? [{ href: `${base}/settings`, label: "Settings", icon: Settings }] : []),
  ];

  return (
    <nav aria-label="Team sections" className="-mb-px flex gap-1 overflow-x-auto border-b border-outline-variant/20 scrollbar-none">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-9 shrink-0 items-center gap-1.5 border-b-2 px-2.5 text-[13px] transition-colors",
              active
                ? "border-on-surface font-medium text-on-surface"
                : "border-transparent text-on-surface/55 hover:text-on-surface"
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
