"use client";

import Link from "next/link";
import { useState } from "react";

import { cn } from "@/lib/utils";

export interface BarListItem {
  label: string;
  value: number;
  href?: string;
}

// Compact single-series horizontal bar chart. One hue (the accent), so no
// legend — the panel title names the series. Bars are thin, square at the
// baseline with a 4px rounded data-end, and carry the value at the tip; a
// hover tooltip adds each bar's share of the total.
export function BarList({
  items,
  formatValue = (v) => v.toLocaleString(),
  emptyLabel = "No data yet.",
}: {
  items: BarListItem[];
  formatValue?: (value: number) => string;
  emptyLabel?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(0, ...items.map((i) => i.value));
  const total = items.reduce((sum, i) => sum + i.value, 0);

  if (items.length === 0) return <p className="text-sm text-on-surface/50">{emptyLabel}</p>;

  return (
    <ul className="space-y-2.5" onMouseLeave={() => setHovered(null)}>
      {items.map((item, index) => {
        const pct = max > 0 ? (item.value / max) * 100 : 0;
        const share = total > 0 ? Math.round((item.value / total) * 100) : 0;
        const active = hovered === index;
        const dimmed = hovered !== null && !active;

        const row = (
          <div
            className="relative grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 py-0.5"
            onMouseEnter={() => setHovered(index)}
            onFocus={() => setHovered(index)}
          >
            <span className={cn("truncate text-xs transition-colors", active ? "text-on-surface" : "text-on-surface/60")}>
              {item.label}
            </span>
            <div className="flex items-center gap-2">
              <div className="relative h-2.5 flex-1">
                <div
                  className={cn(
                    "h-full rounded-r-[4px] bg-primary transition-[opacity,width] duration-300",
                    dimmed ? "opacity-35" : "opacity-100",
                    item.value === 0 && "bg-transparent"
                  )}
                  style={{ width: `${Math.max(pct, item.value > 0 ? 2 : 0)}%` }}
                />
                {active ? (
                  <div
                    role="tooltip"
                    className="pointer-events-none absolute -top-9 z-10 whitespace-nowrap border border-outline-variant/40 bg-surface-container-highest px-2 py-1 text-[11px] text-on-surface shadow-lg"
                    style={{ left: `min(${pct}%, calc(100% - 8rem))` }}
                  >
                    <span className="text-on-surface/60">{item.label}:</span> {formatValue(item.value)}
                    <span className="text-on-surface/50"> · {share}% of total</span>
                  </div>
                ) : null}
              </div>
              <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-on-surface/80">
                {formatValue(item.value)}
              </span>
            </div>
          </div>
        );

        return (
          <li key={item.label}>
            {item.href ? (
              <Link href={item.href} className="block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary">
                {row}
              </Link>
            ) : (
              row
            )}
          </li>
        );
      })}
    </ul>
  );
}
