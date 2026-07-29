"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SearchBar } from "@/components/layout/SearchBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { ProfileMenu, type NavUser } from "@/components/layout/ProfileMenu";

const NAV_LINKS = [
  { label: "Tournament", href: "/tournaments" },
  { label: "Community", href: "/communities" },
  { label: "Organizer", href: "/organizer" },
  { label: "Player", href: "/player" },
  { label: "Judge", href: "/judge" },
];

export function Header({ user }: { user: NavUser | null }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-outline-variant/40 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 md:px-16">
        <Link href="/" className="heading shrink-0 text-lg">
          Player<span className="text-primary">X</span>Judge
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="label-mono text-on-surface/60 transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <SearchBar className="mx-auto hidden max-w-md flex-1 md:block" />

        <div className="ml-auto flex items-center gap-2">
          <Button asChild size="sm" className="hidden gap-1.5 sm:inline-flex">
            <Link href="/tournaments/new">
              <Plus className="h-3.5 w-3.5" /> Add Tournament
            </Link>
          </Button>
          <NotificationsBell count={user ? 2 : 0} />
          <ProfileMenu user={user} />

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <SearchBar className="mt-6" />
              <nav aria-label="Mobile" className="mt-8 flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="label-mono border-b border-outline-variant/20 py-3 text-on-surface/70 hover:text-primary"
                  >
                    {link.label}
                  </Link>
                ))}
                {!user ? (
                  <div className="mt-6 flex flex-col gap-2">
                    <Button asChild variant="outline">
                      <Link href="/login" onClick={() => setMobileOpen(false)}>
                        Sign In
                      </Link>
                    </Button>
                    <Button asChild>
                      <Link href="/register" onClick={() => setMobileOpen(false)}>
                        Join
                      </Link>
                    </Button>
                  </div>
                ) : null}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
