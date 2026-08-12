"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, Search } from "lucide-react";

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
    router.push(`${pathname}?${params.toString()}#player`, { scroll: false });
    setOpen(false);
    setQuery("");
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
        <div className="absolute left-0 top-full z-50 mt-2 w-full max-w-md border border-outline-variant/40 bg-surface-container-lowest shadow-2xl">
          <div className="flex items-center gap-2 border-b border-outline-variant/25 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-on-surface/40" aria-hidden="true" />
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded
              aria-controls={listboxId}
              aria-label="Search participants by blader name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by Blader Name..."
              className="w-full bg-transparent py-1 text-sm text-on-surface outline-none placeholder:text-on-surface/40"
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
    </div>
  );
}
