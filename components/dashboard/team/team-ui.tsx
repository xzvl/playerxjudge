import Link from "next/link";
import { Crown, ExternalLink, Shield, User, UserPlus } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TEAM_ROLE_LABEL } from "@/lib/teams/constants";
import type { LeagueStatus, ProfileSummary } from "@/lib/teams/queries";
import type { MatchResult } from "@/lib/teams/standings";
import type { TeamRole } from "@/lib/types/database";
import { cn } from "@/lib/utils";

// Server-safe display pieces shared by the team dashboard and the public
// team pages.

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[1][0]).toUpperCase();
}

export function TeamLogo({
  name,
  logoUrl,
  size = "md",
  className,
}: {
  name: string;
  logoUrl: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const box = { sm: "h-7 w-7 text-[10px]", md: "h-9 w-9 text-xs", lg: "h-12 w-12 text-sm", xl: "h-20 w-20 text-xl" }[size];
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-outline-variant/25 bg-surface-container font-semibold text-on-surface/70",
        box,
        className
      )}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

export function PlayerAvatar({ profile, size = "sm" }: { profile: ProfileSummary; size?: "xs" | "sm" | "md" }) {
  const box = { xs: "h-5 w-5", sm: "h-6 w-6", md: "h-8 w-8" }[size];
  return (
    <Avatar className={cn(box, "rounded-full")}>
      {profile.avatarUrl ? <AvatarImage src={profile.avatarUrl} alt="" /> : null}
      <AvatarFallback className="rounded-full text-[10px]">{initials(profile.displayName)}</AvatarFallback>
    </Avatar>
  );
}

export function PlayerCell({ profile, sub }: { profile: ProfileSummary; sub?: React.ReactNode }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <PlayerAvatar profile={profile} />
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium text-on-surface">{profile.displayName}</span>
        <span className="block truncate text-xs text-on-surface/45">{sub ?? `@${profile.username}`}</span>
      </span>
    </span>
  );
}

const ROLE_ICON: Record<TeamRole, typeof Crown> = { captain: Crown, sub_captain: Shield, member: User, filler: UserPlus };

export function RoleBadge({ role }: { role: TeamRole }) {
  const Icon = ROLE_ICON[role];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-px text-[11px] font-medium",
        role === "captain" && "bg-amber-500/10 text-amber-500",
        role === "sub_captain" && "bg-sky-500/10 text-sky-500",
        role === "member" && "bg-surface-container-high text-on-surface/75",
        role === "filler" && "border border-dashed border-outline-variant/40 text-on-surface/55"
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {TEAM_ROLE_LABEL[role]}
    </span>
  );
}

export function ResultPill({ result, className }: { result: MatchResult; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-semibold",
        result === "W" && "bg-emerald-500/15 text-emerald-500",
        result === "L" && "bg-primary/10 text-primary",
        result === "T" && "bg-surface-container-high text-on-surface/70",
        className
      )}
      title={result === "W" ? "Win" : result === "L" ? "Loss" : "Tie"}
    >
      {result}
    </span>
  );
}

const STATUS_STYLE: Record<LeagueStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-500/10 text-emerald-500" },
  upcoming: { label: "Upcoming", className: "bg-sky-500/10 text-sky-500" },
  ended: { label: "Ended", className: "bg-surface-container-high text-on-surface/60" },
};

export function LeagueStatusBadge({ status }: { status: LeagueStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-px text-[11px] font-medium", s.className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {s.label}
    </span>
  );
}

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

// League/match dates are plain `date` columns (no time zone): format them
// as UTC so a viewer west of UTC doesn't see the previous day.
export function formatLeagueDate(iso: string): string {
  return dateFmt.format(new Date(`${iso}T00:00:00Z`));
}

export function DateRange({ start, end }: { start: string; end: string }) {
  return (
    <span className="tabular-nums">
      {formatLeagueDate(start)} – {formatLeagueDate(end)}
    </span>
  );
}

export function ExternalPageLink({ href, label = "Public page" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-outline-variant/35 bg-surface-container-low px-3 text-[13px] font-medium text-on-surface transition-colors hover:bg-surface-container"
    >
      {label}
      <ExternalLink className="h-3.5 w-3.5 text-on-surface/50" aria-hidden="true" />
    </Link>
  );
}
