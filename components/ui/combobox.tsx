"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
  disabledReason?: string;
  // Optional thumbnail shown before the label in the dropdown list (e.g.
  // the combo form's Blade/Ratchet/Bit pickers). Left off, options render
  // exactly as before.
  imageUrl?: string | null;
}

export function Combobox({
  label,
  hideLabel = false,
  placeholder,
  value,
  onValueChange,
  options,
  className,
}: {
  label: string;
  // `label` still drives the search input's aria-label and placeholder
  // even when this is set — it only skips the visible "Label: " prefix on
  // the closed button, for callers whose surrounding UI already makes the
  // field's purpose obvious (see JudgeConsole's Stadium field).
  hideLabel?: boolean;
  // Shown (dimmed) on the closed button in place of the "Label: " prefix
  // when nothing's selected yet and hideLabel is set — without it, hiding
  // the label would leave an empty-looking button with no selection.
  placeholder?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly ComboboxOption[];
  className?: string;
}) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  const selectedLabel = selectedOption?.label ?? (hideLabel ? (placeholder ?? "") : "");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

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

  function selectOption(option: ComboboxOption) {
    if (option.disabled) return;
    onValueChange(option.value);
    setOpen(false);
    setQuery("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIndex]) selectOption(filtered[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-full items-center justify-between gap-2 border border-outline-variant/40 bg-surface-container-low px-2 py-2 text-sm text-on-surface transition-colors focus:outline-none focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 data-[state=open]:border-primary"
        data-state={open ? "open" : "closed"}
      >
        <span className="line-clamp-1 text-left text-xs font-medium text-on-surface">
          {hideLabel ? null : <span className="text-on-surface/40">{label}: </span>}
          <span className={cn(hideLabel && !selectedOption && "text-on-surface/40")}>{selectedLabel}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-50 transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1 w-full border border-outline-variant/40 bg-surface-container-lowest shadow-2xl">
          <div className="border-b border-outline-variant/25 p-2">
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-label={`Search ${label.toLowerCase()}`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search..."
              className="w-full bg-transparent px-2 py-1.5 text-sm text-on-surface outline-none placeholder:text-on-surface/40"
            />
          </div>
          <div id={listboxId} role="listbox" className="max-h-64 overflow-auto p-1 text-sm">
            {filtered.length > 0 ? (
              filtered.map((option, i) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  aria-disabled={option.disabled}
                  title={option.disabled ? option.disabledReason : undefined}
                  onClick={() => selectOption(option)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={cn(
                    "flex w-full items-center gap-2 px-2 py-2 text-left !text-[12px] text-on-surface/80",
                    option.disabled
                      ? "cursor-not-allowed text-on-surface/30"
                      : i === activeIndex
                        ? "bg-primary/15 text-primary"
                        : "hover:bg-surface-container-high"
                  )}
                >
                  <Check className={cn("h-3.5 w-3.5 shrink-0", option.value === value ? "opacity-100" : "opacity-0")} />
                  {option.imageUrl !== undefined ? (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden border border-outline-variant/25 bg-white p-[1px]">
                      {option.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={option.imageUrl} alt="" className="h-full w-full object-contain" />
                      ) : null}
                    </span>
                  ) : null}
                  {option.label}
                  {option.disabled && option.disabledReason ? (
                    <span className="label-mono ml-auto text-[8px] text-on-surface/30">{option.disabledReason}</span>
                  ) : null}
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
