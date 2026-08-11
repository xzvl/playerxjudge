"use client";

import { cn } from "@/lib/utils";

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

// Pill button-group for small radio-style choices — same visual language as
// TabsList/TabsTrigger, used where the choice is form state rather than
// navigation (so a real <Tabs> isn't the right primitive).
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentedControlOption<T>[];
  className?: string;
}) {
  return (
    <div className={cn("inline-flex flex-wrap border border-outline-variant/30 bg-surface-container-lowest p-1", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={cn(
              "px-4 py-2 font-mono text-[11px] uppercase tracking-widest transition-colors",
              active ? "bg-primary text-on-primary" : "text-on-surface/50 hover:text-on-surface"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
