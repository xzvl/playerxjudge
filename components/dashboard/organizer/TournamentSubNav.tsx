"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ClipboardList,
  FileText,
  LayoutGrid,
  Megaphone,
  Radio,
  ScrollText,
  Settings,
  Trophy,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface SubNavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export function TournamentSubNav({ baseHref, isTwoStage }: { baseHref: string; isTwoStage: boolean }) {
  const pathname = usePathname();

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
    return (
      <Link
        key={item.href}
        href={item.href}
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
  }

  return (
    <nav className="flex w-full shrink-0 flex-col gap-1 border-b border-outline-variant/25 pb-4 lg:w-56 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4">
      {primaryItems.map(renderItem)}
      <div className="my-2 border-t border-outline-variant/25" />
      {secondaryItems.map(renderItem)}
    </nav>
  );
}
