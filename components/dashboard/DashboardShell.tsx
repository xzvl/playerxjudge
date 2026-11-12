"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, CircleUserRound, LogOut, Menu, UserRound } from "lucide-react";

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
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return <span />;

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1 text-[13px]">
        {segments.map((segment, index) => {
          const last = index === segments.length - 1;
          const label = humanizeSegment(segment);
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
                  className={cn("truncate", last ? "font-medium text-on-surface" : "text-on-surface/50")}
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
  "flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition-colors [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0";

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
            <div className="ml-[15px] mt-px border-l border-outline-variant/20 pl-2">
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
                  nested && "h-7",
                  hasChildren
                    ? "font-medium text-on-surface/80 hover:bg-surface-container hover:text-on-surface [&>svg]:text-on-surface/50"
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
                  <span className="rounded bg-surface-container px-1.5 py-px text-[10px] font-medium text-on-surface/40">Soon</span>
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
                  nested && "h-7",
                  active
                    ? "bg-surface-container-high font-medium text-on-surface [&>svg]:text-on-surface"
                    : "text-on-surface/65 hover:bg-surface-container hover:text-on-surface [&>svg]:text-on-surface/45"
                )}
              >
                {icon}
                <span className="truncate">{label}</span>
              </Link>
              {hasChildren && (
                <button
                  type="button"
                  onClick={toggle}
                  aria-expanded={isOpen}
                  aria-label={`Toggle ${label} submenu`}
                  className="flex h-8 w-7 items-center justify-center rounded-md text-on-surface/40 transition-colors hover:bg-surface-container hover:text-on-surface"
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
      <Avatar className="h-7 w-7 shrink-0 rounded-full">
        {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
        <AvatarFallback className="rounded-full">
          <UserRound className="h-3.5 w-3.5" />
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium leading-4 text-on-surface">{user.displayName}</p>
        <p className="truncate text-xs leading-4 text-on-surface/45">{user.communityName ?? "Individual"}</p>
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
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open account menu">
          <CircleUserRound />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-72 flex-col gap-3 overflow-y-auto">
        <SheetHeader className="sr-only">
          <SheetTitle>{roleLabel}</SheetTitle>
        </SheetHeader>
        {user ? (
          <div className="flex items-center gap-2.5 border-b border-outline-variant/20 pb-3 pr-8">
            <SidebarUser user={user} />
          </div>
        ) : null}
        {mobileNavBody}
      </SheetContent>
    </Sheet>
  );

  return (
    // Only the content column is width-capped, so the sticky sidebar sits
    // flush against the window's left edge on wide screens.
    <div className="app-shell flex min-h-screen bg-background text-on-surface">
      <aside
        className={cn(
          "sticky z-30 hidden w-56 shrink-0 flex-col border-r border-outline-variant/20 bg-surface-container-lowest lg:flex",
          standalone ? "top-0 h-screen" : "top-16 h-[calc(100vh-4rem)]"
        )}
      >
        {standalone ? (
          <div className="flex h-12 shrink-0 items-center border-b border-outline-variant/20 px-4">
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
          <p className="mb-1 px-2 text-xs font-medium text-on-surface/40">{roleLabel}</p>
          <NavList items={navItems} />
        </div>

        {settingsItem && (
          <div className="border-t border-outline-variant/20 px-2 py-2">
            <NavList items={[settingsItem]} />
          </div>
        )}

        <div className="flex items-center gap-2.5 border-t border-outline-variant/20 px-3 py-2.5">
          {user ? <SidebarUser user={user} /> : <span className="flex-1" />}
          <SignOutButton compact />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {standalone ? (
          <>
            {/* lg and up: breadcrumbs, search, theme/notifications/profile. */}
            <header className="sticky top-0 z-30 hidden h-12 items-center justify-between gap-4 border-b border-outline-variant/20 bg-background px-6 lg:flex">
              <Breadcrumbs />
              <div className="flex items-center gap-2">
                <SearchBar className="w-64" />
                <span className="mx-1 h-5 w-px bg-outline-variant/25" aria-hidden="true" />
                <PlayerViewHeaderActions user={user ?? null} notificationCount={notificationCount} />
              </div>
            </header>

            {/* Below lg: logo left; theme/notifications/account menu right. */}
            <header className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-outline-variant/20 bg-background px-4 lg:hidden">
              <Link href="/" aria-label="PlayerXJudge home">
                <BrandLogo width={128} height={14} />
              </Link>
              <div className="flex items-center gap-0.5">
                <ThemeToggle />
                <NotificationsBell count={user ? (notificationCount ?? 0) : 0} enabled={!!user} />
                {accountMobileNav}
              </div>
            </header>
          </>
        ) : (
          <div className="flex h-12 items-center justify-between border-b border-outline-variant/20 px-4 lg:hidden">
            <p className="text-[13px] font-medium text-on-surface">{roleLabel}</p>
            {backendMobileNav}
          </div>
        )}
        <div className="mx-auto max-w-[1400px] px-4 py-5 lg:px-6">{children}</div>
      </div>
    </div>
  );
}
