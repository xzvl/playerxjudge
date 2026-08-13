"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ClipboardList,
  FileText,
  LayoutGrid,
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
        aria-label={collapsed ? item.label : undefined}
        className={cn(
          "label-mono flex items-center gap-3 border-l-2 px-4 py-3 transition-colors",
          collapsed && "justify-center px-0",
          active
            ? "border-primary bg-primary/10 text-primary"
            : "border-transparent text-on-surface/60 hover:border-outline-variant/60 hover:text-on-surface"
        )}
      >
        {item.icon}
        {!collapsed && item.label}
      </Link>
    );

    if (!collapsed) return <div key={item.href}>{link}</div>;

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
        "flex w-full shrink-0 flex-col gap-1 border-b border-outline-variant/25 pb-4 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4",
        collapsed ? "lg:w-14" : "lg:w-56"
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
        className={cn("mb-1", collapsed ? "self-center" : "self-end")}
      >
        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </Button>

      {primaryItems.map(renderItem)}
      <div className="my-2 border-t border-outline-variant/25" />
      {secondaryItems.map(renderItem)}
    </nav>
  );
}
