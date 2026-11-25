import { cn } from "@/lib/utils";

// Skeleton for the public tournament console routes (/player, /judge): shown
// by each route's loading.tsx on first load and on a refresh, until the
// page's data has streamed in.
function Bar({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-surface-container", className)} />;
}

export function TournamentPageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="app-shell min-h-screen bg-background" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="flex h-14 items-center justify-between border-b border-outline-variant/20 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <Bar className="h-8 w-8" />
          <div className="space-y-1.5">
            <Bar className="h-3 w-40" />
            <Bar className="h-2.5 w-24" />
          </div>
        </div>
        <Bar className="h-8 w-8 rounded-full" />
      </div>
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 lg:px-6">
        <div className="space-y-2 border-b border-outline-variant/20 pb-4">
          <Bar className="h-3 w-24" />
          <Bar className="h-6 w-56 max-w-full" />
          <Bar className="h-9 w-full max-w-xs" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-lg border border-outline-variant/20 bg-surface-container-low px-4 py-3">
              <Bar className="h-3 w-20" />
              <Bar className="h-6 w-16" />
            </div>
          ))}
        </div>
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
    </div>
  );
}
