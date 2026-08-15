"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";

export interface JudgePlayerOption {
  id: string;
  displayName: string;
}

// The header's Player 1 / Player 2 pickers — same search-input-in-a-
// listbox interaction as PlayerNamePicker (components/tournaments/player/PlayerNamePicker.tsx)
// and AddJudgeCombobox, scaled to fit a header column and right-aligned
// when `align="right"` (Player 2's side). Below `lg` the header is tight —
// the "Player 1"/"Player 2" label drops and only the stadium side label
// ("[X Side]"/"[B Side]") stays, picking the full label back up at `lg`.
export function JudgePlayerPicker({
  label,
  sideLabel,
  options,
  selectedId,
  onSelect,
  align = "left",
}: {
  label: string;
  sideLabel: string;
  options: JudgePlayerOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  align?: "left" | "right";
}) {
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

  function pick(id: string) {
    onSelect(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className={cn("min-w-0", align === "right" && "text-right")}>
      <p className={cn("label-mono flex items-center gap-1.5 text-on-surface/40", align === "right" && "justify-end")}>
        {align === "right" ? (
          <>
            <span>{sideLabel}</span>
            <span className="hidden lg:inline">{label}</span>
          </>
        ) : (
          <>
            <span className="hidden lg:inline">{label}</span>
            <span>{sideLabel}</span>
          </>
        )}
      </p>
      <div ref={containerRef} className="relative mt-1">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex w-full items-center gap-2 border-b-2 border-outline-variant/30 py-1.5 text-left transition-colors hover:border-primary/60",
            align === "right" && "flex-row-reverse text-right"
          )}
        >
          <span className={cn("min-w-0 flex-1 truncate font-semibold", !selected && "text-on-surface/30")}>
            {selected?.displayName ?? "Blader Name"}
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-on-surface/40 transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>

        {open ? (
          <div
            className={cn(
              "absolute top-full z-50 mt-2 w-64 border border-outline-variant/40 bg-surface-container-lowest shadow-2xl",
              align === "right" ? "right-0" : "left-0"
            )}
          >
            <div className="flex items-center gap-2 border-b border-outline-variant/25 px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-on-surface/40" aria-hidden="true" />
              <input
                ref={inputRef}
                role="combobox"
                aria-expanded
                aria-controls={listboxId}
                aria-label={`Search participants for ${label}`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by Blader Name..."
                className="w-full bg-transparent py-1 text-sm text-on-surface outline-none placeholder:text-on-surface/40"
              />
            </div>
            <div id={listboxId} role="listbox" className="max-h-60 overflow-auto p-1 text-sm">
              {filtered.length > 0 ? (
                filtered.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={option.id === selectedId}
                    onClick={() => pick(option.id)}
                    className={cn(
                      "flex w-full items-center px-3 py-2 text-left text-on-surface/80 hover:bg-surface-container-high",
                      option.id === selectedId && "bg-primary/15 text-primary"
                    )}
                  >
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
    </div>
  );
}
