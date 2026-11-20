import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { ArrowRight, ArrowUpRight, ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";

// Building blocks for the esports HUD look (see `.erp` in globals.css): a
// display-type page header, stat tiles with corner ticks, titled panels,
// a glowing meter and an empty state. Server-safe (no hooks), so pages can use them directly; the
// one interactive chart lives in ./charts.tsx.

type IconType = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  back,
  as: Heading = "h1",
}: {
  // Small context line above the title (e.g. the dashboard name).
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  // Optional "back to parent" link shown in place of the eyebrow.
  back?: { href: string; label: string };
  // "h2" for a sub-page whose layout already renders the page's <h1>
  // (e.g. the tournament workspace tabs).
  as?: "h1" | "h2";
}) {
  return (
    <div className="relative flex flex-wrap items-end justify-between gap-3 border-b border-outline-variant/20 pb-4">
      <span
        aria-hidden="true"
        className="absolute -bottom-px left-0 h-px w-24 bg-primary shadow-[0_0_10px_1px_rgb(var(--m3-primary)/0.8)]"
      />
      <div className="min-w-0">
        {back ? (
          <Link
            href={back.href}
            className="label-mono mb-1.5 inline-flex items-center gap-1 text-on-surface/50 transition-colors hover:text-primary"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            {back.label}
          </Link>
        ) : eyebrow ? (
          <p className="label-mono mb-1.5 flex items-center gap-2 text-primary">
            <span aria-hidden="true" className="h-3 w-[3px] -skew-x-12 bg-primary" />
            {eyebrow}
          </p>
        ) : null}
        <Heading className="heading truncate">{title}</Heading>
        {description ? <p className="mt-1.5 max-w-2xl text-[13px] text-on-surface/55">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function KpiGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4", className)}>{children}</div>;
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
  // Tints the value in the accent: reserve for the one figure a view leads with.
  emphasis?: boolean;
  // Optional compact visual under the value (e.g. a <Meter />).
  children?: ReactNode;
}) {
  const body = (
    <div
      data-slot="card"
      className={cn(
        "group relative h-full overflow-hidden rounded-[3px] border border-outline-variant/25 bg-surface-container-low px-3.5 py-3 transition-all sm:px-4 sm:py-3.5",
        emphasis && "border-primary/40 bg-gradient-to-br from-primary/[0.10] to-transparent",
        href && "hover:-translate-y-px hover:border-primary/60 hover:bg-surface-container"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0 left-0 w-[3px]",
          emphasis ? "bg-primary shadow-[0_0_12px_rgb(var(--m3-primary))]" : "bg-outline-variant/40"
        )}
      />
      <div className="flex items-center justify-between gap-3 pl-1">
        <p className="label-mono truncate text-on-surface/55">{label}</p>
        {Icon ? (
          <Icon className={cn("h-3.5 w-3.5 shrink-0", emphasis ? "text-primary" : "text-on-surface/35")} aria-hidden="true" />
        ) : null}
      </div>
      <p
        className={cn(
          "mt-2 pl-1 font-display text-[2rem] font-bold leading-none tracking-tight tabular-nums sm:text-4xl",
          emphasis ? "text-primary text-glow" : "text-on-surface"
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1.5 pl-1 text-xs text-on-surface/45">{hint}</p> : null}
      {children ? <div className="mt-2.5 pl-1">{children}</div> : null}
      {href ? (
        <ArrowUpRight
          className="absolute bottom-3 right-3 h-3.5 w-3.5 text-on-surface/20 transition-colors group-hover:text-primary"
          aria-hidden="true"
        />
      ) : null}
    </div>
  );

  return href ? (
    <Link href={href} className="tap block h-full rounded-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
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
  title: ReactNode;
  icon?: IconType;
  // A link ({ href, label }) or any node (e.g. a <Button>).
  action?: { href: string; label: string } | ReactNode;
  // Small right-aligned text in the header bar (e.g. a count).
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  const isLinkAction = (a: unknown): a is { href: string; label: string } =>
    typeof a === "object" && a !== null && "href" in a && "label" in a;

  return (
    <section
      data-slot="card"
      className={cn("relative rounded-[3px] border border-outline-variant/25 bg-surface-container-low", className)}
    >
      <span aria-hidden="true" className="pointer-events-none absolute -left-px -top-px h-2.5 w-2.5 border-l-2 border-t-2 border-primary" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-px -right-px h-2.5 w-2.5 border-b-2 border-r-2 border-outline-variant/50" />
      <header className="flex min-h-11 items-center justify-between gap-3 border-b border-outline-variant/20 bg-surface-container/40 px-4 py-2">
        <h2 className="flex min-w-0 items-center gap-2 font-display text-[15px] font-semibold uppercase tracking-[0.06em] text-on-surface">
          {Icon ? <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> : null}
          <span className="truncate">{title}</span>
        </h2>
        <div className="flex shrink-0 items-center gap-3">
          {meta ? <span className="font-mono text-[11px] tabular-nums text-on-surface/50">{meta}</span> : null}
          {isLinkAction(action) ? (
            <Link
              href={action.href}
              className="label-mono flex items-center gap-1 text-on-surface/60 transition-colors hover:text-primary"
            >
              {action.label} <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          ) : (
            action ?? null
          )}
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
      className="h-1.5 w-full -skew-x-12 overflow-hidden bg-primary/15"
    >
      <div
        className="h-full bg-gradient-to-r from-primary-container to-primary shadow-[0_0_10px_rgb(var(--m3-primary)/0.8)] transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: IconType;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[3px] border border-dashed border-outline-variant/30 bg-surface-container-lowest/40 px-6 py-10 text-center",
        className
      )}
    >
      {Icon ? (
        <span className="chamfer-sm mb-3 flex h-11 w-11 items-center justify-center bg-primary/10">
          <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
        </span>
      ) : null}
      <p className="font-display text-lg font-semibold uppercase tracking-[0.05em] text-on-surface">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-[13px] text-on-surface/55">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
