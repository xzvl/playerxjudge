import { cn } from "@/lib/utils";

// Loading placeholders for the dashboards' `loading.tsx` boundaries.
// Besides showing something instantly on navigation, a loading boundary is
// what lets Next prefetch a dynamic route's shell from a <Link>, so a click
// switches the page right away while the data streams in.
//
// Deliberately not used at the app root: once a boundary streams, a later
// notFound() can't change the already-sent 200 status, which would turn
// the public pages' missing-slug 404s into soft 404s.

function Bar({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-surface-container", className)} />;
}

// Content-area skeleton: header, KPI row, a table-ish panel.
export function PageSkeleton({ kpis = true, rows = 6 }: { kpis?: boolean; rows?: number }) {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="space-y-2 border-b border-outline-variant/20 pb-4">
        <Bar className="h-3 w-24" />
        <Bar className="h-6 w-56" />
        <Bar className="h-3 w-80 max-w-full" />
      </div>
      {kpis ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-lg border border-outline-variant/20 bg-surface-container-low px-4 py-3">
              <Bar className="h-3 w-20" />
              <Bar className="h-6 w-16" />
            </div>
          ))}
        </div>
      ) : null}
      <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low">
        <div className="border-b border-outline-variant/20 px-4 py-3">
          <Bar className="h-3.5 w-32" />
        </div>
        <div className="divide-y divide-outline-variant/10">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Bar className="h-6 w-6 rounded-full" />
              <Bar className="h-3 flex-1" />
              <Bar className="hidden h-3 w-24 sm:block" />
              <Bar className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Full-shell skeleton for entering a dashboard from outside it (the shell
// layout itself is still loading): sidebar rail + content skeleton.
export function ShellSkeleton() {
  return (
    <div className="app-shell flex min-h-screen bg-background text-on-surface">
      <aside className="hidden w-56 shrink-0 flex-col gap-2 border-r border-outline-variant/20 bg-surface-container-lowest px-3 py-4 lg:flex">
        <Bar className="mb-4 h-4 w-32" />
        {Array.from({ length: 9 }).map((_, i) => (
          <Bar key={i} className="h-6 w-full" />
        ))}
      </aside>
      <div className="min-w-0 flex-1">
        <div className="h-12 border-b border-outline-variant/20" />
        <div className="mx-auto max-w-[1400px] px-4 py-5 lg:px-6">
          <PageSkeleton />
        </div>
      </div>
    </div>
  );
}
