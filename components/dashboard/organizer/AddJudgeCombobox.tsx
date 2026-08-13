"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface JudgeOption {
  id: string;
  displayName: string;
  username: string;
}

// "Add Judge" search + dropdown — modeled on the player view's
// PlayerNamePicker (components/tournaments/player/PlayerNamePicker.tsx):
// same search-input-inside-a-listbox interaction, scaled down to fit a
// panel control instead of a page-level picker. Unlike PlayerNamePicker,
// picking an option here only *selects* it (shown in the field, matched by
// name or @username) — nothing is sent until the Invite button that then
// appears beside the field is clicked.
export function AddJudgeCombobox({
  options,
  onInvite,
  disabled,
}: {
  options: JudgeOption[];
  onInvite: (judgeId: string) => void;
  disabled?: boolean;
}) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<JudgeOption | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.displayName.toLowerCase().includes(q) || o.username.toLowerCase().includes(q));
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

  function pick(option: JudgeOption) {
    setSelected(option);
    setOpen(false);
    setQuery("");
  }

  function handleInviteClick() {
    if (!selected) return;
    onInvite(selected.id);
    setSelected(null);
  }

  return (
    <div className="flex items-center gap-2">
      <div ref={containerRef} className="relative w-full max-w-sm">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex w-full items-center gap-2 border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-left text-sm transition-colors hover:border-primary/60 disabled:pointer-events-none disabled:opacity-50",
            selected ? "text-on-surface" : "text-on-surface/50"
          )}
        >
          <Search className="h-4 w-4 shrink-0 text-on-surface/40" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{selected ? selected.displayName : "Search by Name / Username"}</span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-on-surface/40 transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>

        {open ? (
          <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-[16rem] border border-outline-variant/40 bg-surface-container-lowest shadow-2xl">
            <div className="flex items-center gap-2 border-b border-outline-variant/25 px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-on-surface/40" aria-hidden="true" />
              <input
                ref={inputRef}
                role="combobox"
                aria-expanded
                aria-controls={listboxId}
                aria-label="Search approved judges by name or username"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by Name / Username..."
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
                    aria-selected={selected?.id === option.id}
                    onClick={() => pick(option)}
                    className="flex w-full items-center px-3 py-2 text-left hover:bg-surface-container-high"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-on-surface/80">{option.displayName}</span>
                      <span className="label-mono block truncate text-[10px] text-on-surface/40">@{option.username}</span>
                    </span>
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-on-surface/40">No approved judges found</p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {selected ? (
        <Button size="sm" className="shrink-0 gap-1.5" disabled={disabled} tooltip={`Invite ${selected.displayName} to judge this tournament`} onClick={handleInviteClick}>
          <UserPlus className="h-3.5 w-3.5" /> Invite
        </Button>
      ) : null}
    </div>
  );
}
