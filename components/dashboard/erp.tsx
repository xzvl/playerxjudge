import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { ArrowRight, ArrowUpRight, ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";

// Building blocks for the dashboard look (see `.erp` in globals.css): a
// compact page header, KPI tiles, titled panels, a single-hue meter and an
// empty state. Server-safe (no hooks), so pages can use them directly; the
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
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-outline-variant/20 pb-4">
      <div className="min-w-0">
        {back ? (
          <Link
            href={back.href}
            className="mb-1 inline-flex items-center gap-1 text-xs text-on-surface/50 transition-colors hover:text-on-surface"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            {back.label}
          </Link>
        ) : eyebrow ? (
          <p className="mb-0.5 text-xs font-medium text-on-surface/45">{eyebrow}</p>
        ) : null}
        <Heading className="heading truncate">{title}</Heading>
        {description ? <p className="mt-0.5 max-w-2xl text-[13px] text-on-surface/55">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
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
  // Tints the value in the accent: reserve for the one figure a view leads with.
  emphasis?: boolean;
  // Optional compact visual under the value (e.g. a <Meter />).
  children?: ReactNode;
}) {
  const body = (
    <div
      data-slot="card"
      className={cn(
        "group relative h-full rounded-lg border border-outline-variant/25 bg-surface-container-low px-4 py-3 transition-colors",
        href && "hover:border-outline-variant/50 hover:bg-surface-container"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-on-surface/55">{label}</p>
        {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 text-on-surface/35" aria-hidden="true" /> : null}
      </div>
      <p
        className={cn(
          "mt-1.5 text-2xl font-semibold leading-none tracking-tight tabular-nums",
          emphasis ? "text-primary" : "text-on-surface"
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-xs text-on-surface/45">{hint}</p> : null}
      {children ? <div className="mt-2.5">{children}</div> : null}
      {href ? (
        <ArrowUpRight
          className="absolute bottom-3 right-3 h-3.5 w-3.5 text-on-surface/20 transition-colors group-hover:text-on-surface/60"
          aria-hidden="true"
        />
      ) : null}
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
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
      className={cn("rounded-lg border border-outline-variant/25 bg-surface-container-low", className)}
    >
      <header className="flex min-h-10 items-center justify-between gap-3 border-b border-outline-variant/20 px-4 py-2">
        <h2 className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-on-surface">
          {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 text-on-surface/45" aria-hidden="true" /> : null}
          <span className="truncate">{title}</span>
        </h2>
        <div className="flex shrink-0 items-center gap-3">
          {meta ? <span className="text-xs tabular-nums text-on-surface/45">{meta}</span> : null}
          {isLinkAction(action) ? (
            <Link
              href={action.href}
              className="flex items-center gap-1 text-xs font-medium text-on-surface/60 transition-colors hover:text-on-surface"
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
      className="h-1.5 w-full overflow-hidden rounded-full bg-primary/15"
    >
      <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
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
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-outline-variant/30 px-6 py-10 text-center",
        className
      )}
    >
      {Icon ? (
        <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-md border border-outline-variant/25 bg-surface-container-low">
          <Icon className="h-4 w-4 text-on-surface/50" aria-hidden="true" />
        </span>
      ) : null}
      <p className="text-sm font-medium text-on-surface">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-[13px] text-on-surface/55">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
