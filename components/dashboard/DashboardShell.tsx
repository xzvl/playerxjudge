"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, LayoutGrid, LogOut, Menu, UserRound } from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { SearchBar } from "@/components/layout/SearchBar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import type { NavUser } from "@/components/layout/ProfileMenu";
// Reused as-is rather than duplicated: it's already a generic
// theme/notifications/profile cluster with nothing player-view-specific.
import { PlayerViewHeaderActions } from "@/components/tournaments/player/PlayerViewHeaderActions";
import { TableCardLabels } from "@/components/dashboard/TableCardLabels";
import { BreadcrumbLabelProvider, useBreadcrumbLabels } from "@/components/dashboard/BreadcrumbLabel";
import { cn } from "@/lib/utils";

export interface DashboardNavItem {
  label: string;
  href?: string;
  icon: ReactNode;
  children?: DashboardNavItem[];
}

function isActiveHref(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function hasActiveDescendant(children: DashboardNavItem[] | undefined, pathname: string): boolean {
  if (!children) return false;
  return children.some(
    (child) => (child.href && isActiveHref(child.href, pathname)) || hasActiveDescendant(child.children, pathname)
  );
}

function humanizeSegment(segment: string): string {
  return decodeURIComponent(segment)
    .split("-")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

// Where-am-I trail for the top bar, straight from the URL. Only the root
// (/account, /backend) links; intermediate segments like /account/player
// aren't pages of their own.
function Breadcrumbs() {
  const pathname = usePathname() ?? "";
  const labels = useBreadcrumbLabels();
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return <span />;

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1 font-mono text-[11px] uppercase tracking-[0.12em]">
        {segments.map((segment, index) => {
          const last = index === segments.length - 1;
          const label = labels[segment] ?? humanizeSegment(segment);
          return (
            <li key={`${segment}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-on-surface/25" aria-hidden="true" /> : null}
              {index === 0 && !last ? (
                <Link href={`/${segment}`} className="text-on-surface/50 transition-colors hover:text-on-surface">
                  {label}
                </Link>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className={cn("truncate", last ? "font-semibold text-primary" : "text-on-surface/50")}
                >
                  {label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const navRowBase =
  "relative flex h-9 w-full items-center gap-2.5 rounded-[3px] px-2.5 text-left font-display text-[15px] font-medium uppercase tracking-[0.05em] transition-colors [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0";

function NavList({
  items,
  onNavigate,
  nested = false,
}: {
  items: DashboardNavItem[];
  onNavigate?: () => void;
  nested?: boolean;
}) {
  const pathname = usePathname() ?? "";
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  return (
    <ul className="flex flex-col gap-px">
      {items.map(({ label, href, icon, children }) => {
        const key = href ?? label;
        const hasChildren = !!children && children.length > 0;
        const isOpen = openMap[key] ?? hasActiveDescendant(children, pathname);
        const toggle = () => setOpenMap((prev) => ({ ...prev, [key]: !isOpen }));
        const submenu =
          hasChildren && isOpen ? (
            <div className="ml-[17px] mt-px border-l border-outline-variant/25 pl-2">
              <NavList items={children} onNavigate={onNavigate} nested />
            </div>
          ) : null;

        // Group header (no page of its own): toggles its children, or is a
        // disabled "Soon" placeholder when it has none.
        if (!href) {
          return (
            <li key={label}>
              <button
                type="button"
                onClick={hasChildren ? toggle : undefined}
                aria-expanded={hasChildren ? isOpen : undefined}
                disabled={!hasChildren}
                className={cn(
                  navRowBase,
                  nested && "h-8 text-[14px]",
                  hasChildren
                    ? "font-semibold text-on-surface/85 hover:bg-surface-container hover:text-on-surface [&>svg]:text-on-surface/50"
                    : "cursor-default text-on-surface/35 [&>svg]:text-on-surface/25"
                )}
              >
                {icon}
                <span className="flex-1 truncate">{label}</span>
                {hasChildren ? (
                  <ChevronDown
                    className={cn("!h-3.5 !w-3.5 text-on-surface/35 transition-transform", !isOpen && "-rotate-90")}
                    aria-hidden="true"
                  />
                ) : (
                  <span className="rounded-[2px] bg-surface-container px-1.5 py-px font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-on-surface/40">Soon</span>
                )}
              </button>
              {submenu}
            </li>
          );
        }

        const active = isActiveHref(href, pathname);
        return (
          <li key={href}>
            <div className="flex items-center gap-px">
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  navRowBase,
                  "flex-1",
                  nested && "h-8 text-[14px]",
                  active
                    ? "bg-gradient-to-r from-primary/20 to-transparent font-semibold text-on-surface [&>svg]:text-primary"
                    : "text-on-surface/60 hover:bg-surface-container hover:text-on-surface [&>svg]:text-on-surface/45"
                )}
              >
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-1 left-0 w-[3px] bg-primary shadow-[0_0_10px_1px_rgb(var(--m3-primary)/0.8)]"
                  />
                ) : null}
                {icon}
                <span className="truncate">{label}</span>
              </Link>
              {hasChildren && (
                <button
                  type="button"
                  onClick={toggle}
                  aria-expanded={isOpen}
                  aria-label={`Toggle ${label} submenu`}
                  className="flex h-9 w-7 items-center justify-center rounded-[3px] text-on-surface/40 transition-colors hover:bg-surface-container hover:text-on-surface"
                >
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", !isOpen && "-rotate-90")} />
                </button>
              )}
            </div>
            {submenu}
          </li>
        );
      })}
    </ul>
  );
}

function SidebarUser({ user }: { user: NavUser }) {
  return (
    <>
      <Avatar className="chamfer-sm h-9 w-9 shrink-0 rounded-none ring-1 ring-primary/50">
        {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
        <AvatarFallback className="rounded-none">
          <UserRound className="h-3.5 w-3.5" />
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-[15px] font-semibold uppercase leading-4 tracking-[0.04em] text-on-surface">{user.displayName}</p>
        <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.1em] leading-4 text-on-surface/45">{user.communityName ?? "Individual"}</p>
      </div>
    </>
  );
}

function SignOutButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action={signOut}>
      {compact ? (
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          tooltip="Sign out of your account"
          aria-label="Sign out"
          className="h-7 w-7 text-on-surface/50 hover:text-on-surface erp:h-7 erp:w-7"
        >
          <LogOut />
        </Button>
      ) : (
        <Button type="submit" variant="ghost" size="sm" tooltip="Sign out of your account" className="w-full justify-start">
          <LogOut /> Sign out
        </Button>
      )}
    </form>
  );
}

// Leaf links of one nav branch, in order; "Soon" placeholders are skipped.
function leafLinks(items: DashboardNavItem[]): DashboardNavItem[] {
  return items.flatMap((item) => [
    ...(item.href ? [item] : []),
    ...(item.children ? leafLinks(item.children) : []),
  ]);
}

// App-style bottom bar for phones and tablets. Shows the four most useful
// destinations of the dashboard you're currently in (so a player sees
// Overview / Upcoming / Registered / Match history, an organizer sees
// theirs) plus a Menu tab that opens everything.
function BottomTabBar({ navItems, onMenu }: { navItems: DashboardNavItem[]; onMenu: () => void }) {
  const pathname = usePathname() ?? "";
  const group =
    navItems.find((item) => leafLinks([item]).some((l) => l.href && isActiveHref(l.href, pathname))) ?? navItems[0];
  const tabs = group ? leafLinks(group.children ?? [group]).slice(0, 4) : [];

  return (
    <nav
      aria-label="Dashboard"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant/25 bg-background/85 backdrop-blur-xl lg:hidden"
    >
      <ul className="mx-auto grid h-14 max-w-xl" style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}>
        {tabs.map(({ label, href, icon }) => {
          const active = !!href && isActiveHref(href, pathname);
          return (
            <li key={href}>
              <Link href={href!} aria-current={active ? "page" : undefined} className="tap relative flex h-full flex-col items-center justify-center gap-0.5">
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-4 top-0 h-[2px] bg-primary shadow-[0_0_12px_2px_rgb(var(--m3-primary)/0.7)]"
                  />
                ) : null}
                <span
                  className={cn(
                    "[&>svg]:!h-[22px] [&>svg]:!w-[22px] transition-all",
                    active ? "text-primary drop-shadow-[0_0_8px_rgb(var(--m3-primary)/0.6)]" : "text-on-surface/50"
                  )}
                >
                  {icon}
                </span>
                <span
                  className={cn(
                    "max-w-full truncate px-1 font-mono text-[9.5px] font-medium uppercase tracking-[0.1em]",
                    active ? "text-on-surface" : "text-on-surface/45"
                  )}
                >
                  {label.replace(/ Tournaments?$/i, "")}
                </span>
              </Link>
            </li>
          );
        })}
        <li>
          <button type="button" onClick={onMenu} className="tap flex h-full w-full flex-col items-center justify-center gap-0.5 text-on-surface/50">
            <LayoutGrid className="h-[22px] w-[22px]" aria-hidden="true" />
            <span className="font-mono text-[9.5px] font-medium uppercase tracking-[0.1em] text-on-surface/45">Menu</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}

export function DashboardShell({
  roleLabel,
  navItems,
  settingsItem,
  user,
  notificationCount,
  children,
}: {
  roleLabel: string;
  navItems: DashboardNavItem[];
  settingsItem?: DashboardNavItem;
  // Passing `user` (even `null`, for a signed-out view) switches the shell
  // into "standalone" mode: a full-height sidebar starting at the very top
  // of the page plus its own content-area header (search + theme/
  // notifications/profile) instead of relying on the global site Header,
  // which hides itself on every /account route (see Header.tsx /
  // isAccountRoute). /backend doesn't pass this prop and keeps the global
  // Header above it.
  user?: NavUser | null;
  notificationCount?: number;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const standalone = user !== undefined;
  const closeMobile = () => setMobileOpen(false);

  const mobileNavBody = (
    <>
      <div className="flex-1">
        <NavList items={navItems} onNavigate={closeMobile} />
        {settingsItem && (
          <div className="mt-2 border-t border-outline-variant/20 pt-2">
            <NavList items={[settingsItem]} onNavigate={closeMobile} />
          </div>
        )}
      </div>
      <div className="border-t border-outline-variant/20 pt-3">
        <SignOutButton />
      </div>
    </>
  );

  // /backend's hamburger: nav only (no profile is passed in).
  const backendMobileNav = (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open dashboard menu">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-72 flex-col gap-3 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{roleLabel}</SheetTitle>
        </SheetHeader>
        {mobileNavBody}
      </SheetContent>
    </Sheet>
  );

  // /account's mobile/tablet menu, opened by the account icon in the
  // standalone header below; carries the user's profile above the nav.
  const accountMobileNav = (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetContent
        side="bottom"
        className="pb-safe flex max-h-[85dvh] flex-col gap-3 overflow-y-auto rounded-t-xl border-t border-primary/40 !p-4"
      >
        <span aria-hidden="true" className="mx-auto h-1 w-10 shrink-0 rounded-full bg-outline-variant/50" />
        <SheetHeader className="sr-only">
          <SheetTitle>{roleLabel}</SheetTitle>
        </SheetHeader>
        {user ? (
          <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-3 pr-8">
            <SidebarUser user={user} />
          </div>
        ) : null}
        {mobileNavBody}
      </SheetContent>
    </Sheet>
  );

  return (
    <BreadcrumbLabelProvider>
    {/* Only the content column is width-capped, so the sticky sidebar sits
        flush against the window's left edge on wide screens. */}
    <div className="app-shell flex min-h-screen bg-background text-on-surface">
      <aside
        className={cn(
          "sticky z-30 hidden w-60 shrink-0 flex-col border-r border-outline-variant/25 bg-surface-container-lowest lg:flex",
          standalone ? "top-0 h-screen" : "top-16 h-[calc(100vh-4rem)]"
        )}
      >
        {standalone ? (
          <div className="flex h-14 shrink-0 items-center border-b border-outline-variant/25 px-4">
            <Link
              href="/"
              aria-label="PlayerXJudge home"
              className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <BrandLogo width={136} height={15} />
            </Link>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto px-2 py-3">
          <p className="label-mono mb-2 flex items-center gap-2 px-2 text-primary">
            <span aria-hidden="true" className="h-3 w-[3px] -skew-x-12 bg-primary" />
            {roleLabel}
          </p>
          <NavList items={navItems} />
        </div>

        {settingsItem && (
          <div className="border-t border-outline-variant/20 px-2 py-2">
            <NavList items={[settingsItem]} />
          </div>
        )}

        <div className="flex items-center gap-2.5 border-t border-outline-variant/25 bg-surface-container-low px-3 py-3">
          {user ? <SidebarUser user={user} /> : <span className="flex-1" />}
          <SignOutButton compact />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {standalone ? (
          <>
            {/* lg and up: breadcrumbs, search, theme/notifications/profile. */}
            <header className="sticky top-0 z-30 hidden h-14 items-center justify-between gap-4 border-b border-outline-variant/25 bg-background/85 px-6 backdrop-blur-xl lg:flex">
              <Breadcrumbs />
              <div className="flex items-center gap-2">
                <SearchBar className="w-64" />
                <span className="mx-1 h-5 w-px bg-outline-variant/25" aria-hidden="true" />
                <PlayerViewHeaderActions user={user ?? null} notificationCount={notificationCount} />
              </div>
            </header>

            {/* Below lg: logo left; theme/notifications/account menu right. */}
            <header className="pt-safe sticky top-0 z-40 border-b border-outline-variant/25 bg-background/85 backdrop-blur-xl lg:hidden">
              <div className="flex h-14 items-center justify-between px-4">
                <Link href="/" aria-label="PlayerXJudge home">
                  <BrandLogo width={128} height={14} />
                </Link>
                <div className="flex items-center gap-0.5">
                  <ThemeToggle />
                  <NotificationsBell count={user ? (notificationCount ?? 0) : 0} enabled={!!user} />
                  <Link
                    href="/account/settings"
                    aria-label="Account settings"
                    className="tap ml-1 flex h-9 w-9 items-center justify-center"
                  >
                    <Avatar className="chamfer-sm h-8 w-8 rounded-none ring-1 ring-primary/50">
                      {user?.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
                      <AvatarFallback className="rounded-none">
                        <UserRound className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                </div>
              </div>
            </header>
          </>
        ) : (
          <div className="flex h-14 items-center justify-between border-b border-outline-variant/25 px-4 lg:hidden">
            <p className="font-display text-base font-semibold uppercase tracking-[0.06em] text-on-surface">{roleLabel}</p>
            {backendMobileNav}
          </div>
        )}
        <div
          id="dashboard-content"
          className={cn("mx-auto max-w-[1400px] px-4 py-5 lg:px-6 lg:py-6", standalone && "pb-tabbar lg:pb-6")}
        >
          {children}
        </div>
        <TableCardLabels rootId="dashboard-content" />
        {standalone ? <BottomTabBar navItems={navItems} onMenu={() => setMobileOpen(true)} /> : null}
        {standalone ? accountMobileNav : null}
      </div>
    </div>
    </BreadcrumbLabelProvider>
  );
}
