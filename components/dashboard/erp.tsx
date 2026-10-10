import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

// Building blocks for the enterprise dashboard look (see `.erp` in
// globals.css): a compact page header, KPI summary tiles, titled panels,
// and a single-hue meter. Server-safe — no hooks — so dashboard pages can
// use them directly; the one interactive chart lives in ./charts.tsx.

type IconType = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-outline-variant/25 pb-5">
      <div className="min-w-0">
        {eyebrow ? <p className="label-mono !text-[10px] text-primary">{eyebrow}</p> : null}
        <h1 className="heading mt-1">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-on-surface/55">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function KpiGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}>{children}</div>;
}

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  emphasis = false,
  children,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: IconType;
  href?: string;
  // Tints the value in the accent — reserve for the one figure a view leads with.
  emphasis?: boolean;
  // Optional compact visual under the value (e.g. a <Meter />).
  children?: ReactNode;
}) {
  const body = (
    <div
      data-slot="card"
      className={cn(
        "group relative h-full overflow-hidden border border-outline-variant/25 bg-surface-container-low p-4 transition-colors",
        href && "hover:border-primary/50"
      )}
    >
      {/* Accent rail — lights up on hover for linked tiles. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary/70 via-primary/20 to-transparent transition-opacity",
          emphasis ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <p className="label-mono !text-[10px] !tracking-[0.16em] text-on-surface/50">{label}</p>
        {Icon ? (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-outline-variant/30 bg-surface-container text-on-surface/50 transition-colors group-hover:text-primary">
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p className={cn("mt-2 font-inter text-[28px] font-bold leading-none tracking-tight", emphasis ? "text-primary" : "text-on-surface")}>
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-on-surface/50">{hint}</p> : null}
      {children ? <div className="mt-3">{children}</div> : null}
      {href ? (
        <ArrowUpRight
          className="absolute bottom-3 right-3 h-3.5 w-3.5 text-on-surface/20 transition-colors group-hover:text-primary"
          aria-hidden="true"
        />
      ) : null}
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary">
      {body}
    </Link>
  ) : (
    body
  );
}

export function Panel({
  title,
  icon: Icon,
  action,
  meta,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  icon?: IconType;
  action?: { href: string; label: string };
  // Small right-aligned text in the header bar (e.g. a count).
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section data-slot="card" className={cn("border border-outline-variant/25 bg-surface-container-low", className)}>
      <header className="flex items-center justify-between gap-3 border-b border-outline-variant/20 px-4 py-2.5">
        <h2 className="label-mono flex items-center gap-2 !text-[10px] text-on-surface/70">
          {Icon ? <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> : null}
          {title}
        </h2>
        <div className="flex items-center gap-3">
          {meta ? <span className="font-mono text-[11px] text-on-surface/40">{meta}</span> : null}
          {action ? (
            <Link href={action.href} className="label-mono flex items-center gap-1 !text-[10px] text-primary hover:underline">
              {action.label} <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </header>
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

// Single-hue meter: accent fill on a lighter step of the same hue, so the
// unfilled remainder still reads as part of the same scale.
export function Meter({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className="h-1.5 w-full bg-primary/15"
    >
      <div className="h-full rounded-r-[4px] bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}
