"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, Search } from "lucide-react";

import { PlayerLoadingScreen } from "@/components/tournaments/player/PlayerLoadingScreen";
import { cn } from "@/lib/utils";

export interface PlayerOption {
  id: string;
  displayName: string;
}

// The big "player name" selector atop the Current Stats section — picks
// which tournament participant the rest of the page's stats are for.
// Selection lives in the `p` search param (not component state) so the
// picked player survives a refresh/share/back-navigation, same pattern as
// the organizer participants page's `?tab=` query param.
export function PlayerNamePicker({ options, selectedId }: { options: PlayerOption[]; selectedId: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Switching players navigates to a new `?p=` — a real server round trip,
  // since page.tsx reads it to re-fetch/recompute everything below. This
  // route's own loading.tsx handles a *fresh* arrival here reliably, but a
  // same-page searchParams-only navigation isn't guaranteed to trigger that
  // boundary the same way (Next.js can treat it as updating the existing
  // tree rather than a full segment transition). useTransition is the
  // explicit, guaranteed-to-fire alternative: isPending stays true for the
  // whole router.push, including the wait on the new page render, so the
  // overlay below is what actually shows "every changing of players" —
  // not a maybe.
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.id === selectedId) ?? null;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.displayName.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function selectPlayer(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("p", id);
    setOpen(false);
    setQuery("");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}#player`, { scroll: false });
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((o) => !o)}
        className="heading flex w-full items-center gap-3 border-b-2 border-outline-variant/30 py-2 text-left text-3xl transition-colors hover:border-primary/60 md:text-4xl"
      >
        <span className={cn("min-w-0 flex-1 truncate", !selected && "text-on-surface/30")}>
          {selected?.displayName ?? "Search by Blader Name"}
        </span>
        <ChevronDown className={cn("h-6 w-6 shrink-0 text-on-surface/40 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-2 w-full max-w-md overflow-hidden rounded-md border border-outline-variant/30 bg-surface-container-low shadow-2xl">
          <div className="flex items-center gap-2 border-b border-outline-variant/20 px-2.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-on-surface/40" aria-hidden="true" />
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded
              aria-controls={listboxId}
              aria-label="Search participants by blader name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by Blader Name..."
              className="h-8 w-full bg-transparent text-[13px] text-on-surface outline-none placeholder:text-on-surface/40"
            />
          </div>
          <div id={listboxId} role="listbox" className="max-h-72 overflow-auto p-1 text-sm">
            {filtered.length > 0 ? (
              filtered.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={option.id === selectedId}
                  onClick={() => selectPlayer(option.id)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2.5 text-left text-on-surface/80 hover:bg-surface-container-high",
                    option.id === selectedId && "bg-primary/15 text-primary"
                  )}
                >
                  <Check className={cn("h-3.5 w-3.5 shrink-0", option.id === selectedId ? "opacity-100" : "opacity-0")} />
                  {option.displayName}
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-on-surface/40">No matches</p>
            )}
          </div>
        </div>
      ) : null}

      {isPending ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <PlayerLoadingScreen />
        </div>
      ) : null}
    </div>
  );
}
