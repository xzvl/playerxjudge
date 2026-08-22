"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ClipboardList,
  FileText,
  LayoutGrid,
  Medal,
  Megaphone,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  ScrollText,
  Settings,
  Trophy,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SubNavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

// Shared by the desktop rail and the mobile sheet below so the two never
// drift out of sync with each other.
function buildSubNavItems(baseHref: string, isTwoStage: boolean): { primaryItems: SubNavItem[]; secondaryItems: SubNavItem[] } {
  // The stage that comes first (Group Stage for two-stage tournaments, Final
  // Stage otherwise) lives at the workspace root — its own route is only
  // needed for the *other* stage of a two-stage tournament.
  const primaryItems: SubNavItem[] = [
    ...(isTwoStage
      ? [{ label: "Group Stage", href: baseHref, icon: <LayoutGrid className="h-4 w-4 shrink-0" /> }]
      : []),
    {
      label: "Final Stage",
      href: isTwoStage ? `${baseHref}/final-stage` : baseHref,
      icon: <Trophy className="h-4 w-4 shrink-0" />,
    },
    { label: "Standings", href: `${baseHref}/standings`, icon: <BarChart3 className="h-4 w-4 shrink-0" /> },
    { label: "Top Finishers", href: `${baseHref}/top-finishers`, icon: <Medal className="h-4 w-4 shrink-0" /> },
    { label: "Announcement", href: `${baseHref}/announcements`, icon: <Megaphone className="h-4 w-4 shrink-0" /> },
    { label: "Log", href: `${baseHref}/log`, icon: <ScrollText className="h-4 w-4 shrink-0" /> },
    { label: "Stations", href: `${baseHref}/stations`, icon: <Radio className="h-4 w-4 shrink-0" /> },
  ];

  const secondaryItems: SubNavItem[] = [
    { label: "Participants", href: `${baseHref}/participants`, icon: <Users className="h-4 w-4 shrink-0" /> },
    { label: "Pre-Register", href: `${baseHref}/pre-register`, icon: <ClipboardList className="h-4 w-4 shrink-0" /> },
    { label: "Settings", href: `${baseHref}/settings`, icon: <Settings className="h-4 w-4 shrink-0" /> },
    { label: "Reports", href: `${baseHref}/reports`, icon: <FileText className="h-4 w-4 shrink-0" /> },
  ];

  return { primaryItems, secondaryItems };
}

function isActiveItem(item: SubNavItem, pathname: string): boolean {
  return pathname === item.href;
}

export function TournamentSubNav({ baseHref, isTwoStage }: { baseHref: string; isTwoStage: boolean }) {
  const pathname = usePathname();
  // This in-content workspace nav (not the account-level <aside> — see
  // DashboardShell) collapses to an icon-only rail so the tournament's
  // actual content gets more room. Local state only: it lives inside this
  // route's own layout, which persists across the workspace's sibling pages
  // (group stage, standings, settings, ...) without remounting, so the
  // choice survives navigating between them. Desktop (lg+) only — below lg
  // this rail doesn't render at all; see TournamentSubNavMobileBar instead.
  const [collapsed, setCollapsed] = useState(false);

  const { primaryItems, secondaryItems } = buildSubNavItems(baseHref, isTwoStage);

  function renderItem(item: SubNavItem) {
    const active = isActiveItem(item, pathname);
    const link = (
      <Link
        href={item.href}
        aria-label={item.label}
        className={cn(
          "label-mono flex items-center justify-center gap-3 border-l-2 px-0 py-3 transition-colors",
          !collapsed && "lg:justify-start lg:px-4",
          active
            ? "border-primary bg-primary/10 text-primary"
            : "border-transparent text-on-surface/60 hover:border-outline-variant/60 hover:text-on-surface"
        )}
      >
        {item.icon}
        <span className={cn("hidden", !collapsed && "lg:inline")}>{item.label}</span>
      </Link>
    );

    return (
      <Tooltip key={item.href}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <nav
      className={cn(
        "hidden w-14 shrink-0 flex-col items-center gap-1 border-r border-outline-variant/25 pr-2 lg:flex",
        !collapsed && "lg:w-56 lg:items-stretch lg:pr-4"
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        tooltip={collapsed ? "Expand navigation" : "Collapse navigation"}
        tooltipSide="right"
        className={cn("mb-1 self-center", !collapsed && "lg:self-end")}
      >
        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </Button>

      {primaryItems.map(renderItem)}
      <div className="my-2 w-full border-t border-outline-variant/25" />
      {secondaryItems.map(renderItem)}
    </nav>
  );
}

// Mobile/tablet stand-in for the rail above (which is lg+ only): a sticky
// bar carrying just a hamburger + the current page's label, sitting right
// under the workspace's "All Tournaments" back-link (see
// app/account/organizer/tournament/[slug]/layout.tsx) so it stays visible
// and pinned together with DashboardShell's own sticky mobile header
// (top-16 matches that header's height) while scrolling. Tapping it opens
// the same item list as the desktop rail, fully labeled — "like the main
// menu" (DashboardShell's own mobile nav sheets).
export function TournamentSubNavMobileBar({ baseHref, isTwoStage }: { baseHref: string; isTwoStage: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { primaryItems, secondaryItems } = buildSubNavItems(baseHref, isTwoStage);
  const allItems = [...primaryItems, ...secondaryItems];
  const currentLabel = allItems.find((item) => isActiveItem(item, pathname))?.label ?? "Menu";

  return (
    <div className="sticky top-16 z-20 -mx-6 border-b border-outline-variant/25 bg-surface-container-lowest/95 px-6 backdrop-blur-md lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label="Open tournament menu"
            className="label-mono flex w-full items-center gap-2 py-3 text-on-surface/80"
          >
            <Menu className="h-4 w-4 shrink-0" aria-hidden="true" />
            {currentLabel}
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col overflow-y-auto">
          <SheetHeader className="sr-only">
            <SheetTitle>Tournament Menu</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1">
            {allItems.map((item) => {
              const active = isActiveItem(item, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "label-mono flex items-center gap-3 border-l-2 px-4 py-3 transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-transparent text-on-surface/60 hover:border-outline-variant/60 hover:text-on-surface"
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
