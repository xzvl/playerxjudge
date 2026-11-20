"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Search, Swords, Trophy, Users2 } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const SHORTCUTS = [
  { label: "Tournaments", href: "/tournaments", Icon: Swords },
  { label: "Calendar", href: "/calendar", Icon: CalendarDays },
  { label: "Communities", href: "/communities", Icon: Users2 },
  { label: "Leaderboard", href: "/leaderboard", Icon: Trophy },
];

// Header search as a command-palette: a pill (desktop) or icon (phones)
// opens a focused overlay. Press "/" anywhere to open it.
export function HeaderSearch({ variant = "pill", className }: { variant?: "pill" | "icon"; className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      e.preventDefault();
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = query.trim();
      setOpen(false);
      router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
    },
    [query, router]
  );

  return (
    <>
      {variant === "pill" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "tap group flex h-10 w-full items-center gap-2.5 rounded-[3px] border border-outline-variant/30 bg-surface-container-low/70 px-3 text-left text-[13px] text-on-surface/50 transition-all hover:border-primary/50 hover:bg-surface-container hover:text-on-surface/80",
            className
          )}
        >
          <Search className="h-4 w-4 shrink-0 text-on-surface/50 group-hover:text-primary" aria-hidden="true" />
          <span className="flex-1 truncate">Search players, events, clubs…</span>
          <kbd className="hidden rounded-[2px] border border-outline-variant/40 bg-background/60 px-1.5 py-0.5 font-mono text-[10px] text-on-surface/50 xl:block">
            /
          </kbd>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Search"
          className={cn(
            "tap flex h-10 w-10 items-center justify-center rounded-[3px] text-on-surface/70 transition-colors hover:bg-surface-container hover:text-on-surface",
            className
          )}
        >
          <Search className="h-5 w-5" aria-hidden="true" />
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[max(1rem,8vh)] max-w-xl translate-y-0 border-primary/40 max-sm:left-0 max-sm:w-full max-sm:max-w-none max-sm:translate-x-0">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <DialogDescription className="sr-only">Search tournaments, communities, players and judges.</DialogDescription>
          <form onSubmit={submit} role="search" className="flex items-center gap-3 border-b border-outline-variant/25 px-4 py-3 pr-14">
            <Search className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search players, events, clubs…"
              aria-label="Search tournaments, communities, players, and judges"
              className="h-9 w-full bg-transparent font-display text-xl font-medium tracking-wide text-on-surface placeholder:text-on-surface/35 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
          </form>
          <div className="px-4 pb-4">
            {query.trim() ? (
              <button
                type="button"
                onClick={submit}
                className="flex w-full items-center gap-3 rounded-[3px] bg-primary/10 px-3 py-3 text-left text-sm transition-colors hover:bg-primary/20"
              >
                <Search className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">
                  Search for <strong className="text-on-surface">“{query.trim()}”</strong>
                </span>
                <ArrowRight className="h-4 w-4 text-primary" aria-hidden="true" />
              </button>
            ) : (
              <>
                <p className="label-mono mb-2 text-on-surface/45">Jump to</p>
                <ul className="grid grid-cols-2 gap-2">
                  {SHORTCUTS.map(({ label, href, Icon }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={() => setOpen(false)}
                        className="tap flex items-center gap-3 rounded-[3px] border border-outline-variant/25 bg-surface-container px-3 py-3 font-display text-base font-semibold uppercase tracking-[0.05em] transition-colors hover:border-primary/60 hover:bg-primary/10"
                      >
                        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
