"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu } from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface DashboardNavItem {
  label: string;
  href?: string;
  icon: ComponentType<{ className?: string }>;
}

function NavList({ items, onNavigate }: { items: DashboardNavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {items.map(({ label, href, icon: Icon }) => {
        if (!href) {
          return (
            <div
              key={label}
              className="label-mono flex items-center gap-3 border-l-2 border-transparent px-4 py-3 text-on-surface/30"
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              <span className="text-[9px] text-on-surface/20">Soon</span>
            </div>
          );
        }

        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "label-mono flex items-center gap-3 border-l-2 px-4 py-3 transition-colors",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-transparent text-on-surface/60 hover:border-outline-variant/60 hover:text-on-surface"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardShell({
  roleLabel,
  navItems,
  children,
}: {
  roleLabel: string;
  navItems: DashboardNavItem[];
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
        <div className="border-t border-outline-variant/25 p-4">
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm" className="w-full gap-2 justify-start">
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex-1">
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
              <form action={signOut} className="mt-6">
                <Button type="submit" variant="ghost" size="sm" className="w-full gap-2 justify-start">
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
