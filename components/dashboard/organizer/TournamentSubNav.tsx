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
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  ScrollText,
  Settings,
  Trophy,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SubNavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export function TournamentSubNav({ baseHref, isTwoStage }: { baseHref: string; isTwoStage: boolean }) {
  const pathname = usePathname();
  // This in-content workspace nav (not the account-level <aside> — see
  // DashboardShell) collapses to an icon-only rail so the tournament's
  // actual content gets more room. Local state only: it lives inside this
  // route's own layout, which persists across the workspace's sibling pages
  // (group stage, standings, settings, ...) without remounting, so the
  // choice survives navigating between them.
  const [collapsed, setCollapsed] = useState(false);

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

  function renderItem(item: SubNavItem) {
    const active = pathname === item.href;
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

    // Below lg this rail is always icon-only (the collapse toggle itself
    // hides there — see the Button below), so the tooltip earns its keep
    // at every breakpoint now, not just when desktop is collapsed.
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
        "flex w-14 shrink-0 flex-col items-center gap-1 border-r border-outline-variant/25 pr-2",
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
        className={cn("mb-1 hidden self-center lg:flex", !collapsed && "lg:self-end")}
      >
        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </Button>

      {primaryItems.map(renderItem)}
      <div className="my-2 w-full border-t border-outline-variant/25" />
      {secondaryItems.map(renderItem)}
    </nav>
  );
}
