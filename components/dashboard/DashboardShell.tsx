"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, Menu } from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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

function NavList({
  items,
  onNavigate,
  nested = false,
}: {
  items: DashboardNavItem[];
  onNavigate?: () => void;
  nested?: boolean;
}) {
  const pathname = usePathname();
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  return (
    <nav className="flex flex-col gap-1">
      {items.map(({ label, href, icon, children }) => {
        const key = href ?? label;
        const hasChildren = !!children && children.length > 0;
        const isOpen = openMap[key] ?? hasActiveDescendant(children, pathname);
        const toggle = () => setOpenMap((prev) => ({ ...prev, [key]: !isOpen }));

        if (!href) {
          return (
            <div key={label}>
              <button
                type="button"
                onClick={hasChildren ? toggle : undefined}
                aria-expanded={hasChildren ? isOpen : undefined}
                className={cn(
                  "label-mono flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition-colors",
                  nested && "py-2 text-[11px]",
                  hasChildren
                    ? "border-transparent text-on-surface/60 hover:border-outline-variant/60 hover:text-on-surface"
                    : "cursor-default border-transparent text-on-surface/30"
                )}
              >
                {icon}
                <span className="flex-1">{label}</span>
                {hasChildren ? (
                  <ChevronDown
                    className={cn("h-3.5 w-3.5 shrink-0 text-on-surface/40 transition-transform", !isOpen && "-rotate-90")}
                  />
                ) : (
                  <span className="text-[9px] text-on-surface/20">Soon</span>
                )}
              </button>
              {hasChildren && isOpen && (
                <div className="pl-6">
                  <NavList items={children} onNavigate={onNavigate} nested />
                </div>
              )}
            </div>
          );
        }

        const active = isActiveHref(href, pathname);
        return (
          <div key={href}>
            <div className="flex items-center">
              <Link
                href={href}
                onClick={onNavigate}
                className={cn(
                  "label-mono flex flex-1 items-center gap-3 border-l-2 px-4 py-3 transition-colors",
                  nested && "py-2 text-[11px]",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-transparent text-on-surface/60 hover:border-outline-variant/60 hover:text-on-surface"
                )}
              >
                {icon}
                {label}
              </Link>
              {hasChildren && (
                <button
                  type="button"
                  onClick={toggle}
                  aria-expanded={isOpen}
                  aria-label={`Toggle ${label} submenu`}
                  className="px-3 py-3 text-on-surface/40 transition-colors hover:text-on-surface"
                >
                  <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", !isOpen && "-rotate-90")} />
                </button>
              )}
            </div>
            {hasChildren && isOpen && (
              <div className="pl-6">
                <NavList items={children} onNavigate={onNavigate} nested />
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export function DashboardShell({
  roleLabel,
  navItems,
  settingsItem,
  children,
}: {
  roleLabel: string;
  navItems: DashboardNavItem[];
  settingsItem?: DashboardNavItem;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="mx-auto flex max-w-[1440px]">
      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 flex-col border-r border-outline-variant/25 bg-surface-container-lowest lg:flex">
        <div className="p-4">
          <p className="label-mono text-primary">{roleLabel} Dashboard</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavList items={navItems} />
        </div>
        {settingsItem && (
          <div className="border-t border-outline-variant/25">
            <NavList items={[settingsItem]} />
          </div>
        )}
        <div className="border-t border-outline-variant/25">
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              tooltip="Sign out of your account"
              className="w-full border-l-2 transition-colors border-transparent hover:border-outline-variant/60 hover:text-on-surface gap-2 justify-start h-11"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between border-b border-outline-variant/25 p-4 lg:hidden">
          <p className="label-mono text-primary">{roleLabel} Dashboard</p>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open dashboard menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>{roleLabel} Dashboard</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <NavList items={navItems} onNavigate={() => setMobileOpen(false)} />
              </div>
              {settingsItem && (
                <div className="mt-2 border-t border-outline-variant/25 pt-2">
                  <NavList items={[settingsItem]} onNavigate={() => setMobileOpen(false)} />
                </div>
              )}
              <form action={signOut} className="mt-6">
                <Button type="submit" variant="ghost" size="sm" tooltip="Sign out of your account" className="w-full gap-2 justify-start">
                  <LogOut className="h-4 w-4" /> Sign Out
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
