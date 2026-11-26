import type { ReactNode } from "react";

import { EmptyState } from "@/components/dashboard/erp";
import { cn } from "@/lib/utils";

// The one table. Desktop: a bordered, horizontally-scrollable grid with
// mono column heads. Below lg the dashboard CSS (`#dashboard-content table`
// in globals.css + TableCardLabels) turns every row into a labelled card, so
// phones never get a zoomed-out grid. The first column is the card title, and
// a column with no `header` text (use `actions`) becomes the card's action row.
export interface DataColumn<T> {
  key: string;
  // Column head. Omit for an actions column (it gets an sr-only "Actions").
  header?: string;
  cell: (row: T) => ReactNode;
  className?: string;
  // Marks the trailing row-actions column: right-aligned, never wraps.
  actions?: boolean;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  minWidth = 720,
  empty,
  caption,
  rowClassName,
  className,
}: {
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  // Minimum grid width before the wrapper scrolls (desktop only).
  minWidth?: number;
  // Shown instead of the table when `rows` is empty.
  empty?: { title: string; description?: ReactNode; action?: ReactNode };
  // Visually hidden description of the table for screen readers.
  caption?: string;
  rowClassName?: (row: T) => string | undefined;
  className?: string;
}) {
  if (rows.length === 0 && empty) {
    return <EmptyState title={empty.title} description={empty.description} action={empty.action} className={className} />;
  }

  return (
    <div className={cn("overflow-x-auto rounded-[3px] border border-outline-variant/25", className)}>
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="label-mono border-b border-outline-variant/25 bg-surface-container/40 text-on-surface/50">
            {columns.map((col) => (
              <th key={col.key} scope="col" className={cn("px-4 py-3 font-medium", col.actions && "text-right", col.className)}>
                {col.header ?? <span className="sr-only">Actions</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={cn(
                "border-b border-outline-variant/15 transition-colors last:border-0 hover:bg-surface-container/50",
                rowClassName?.(row)
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn("px-4 py-3 align-middle", col.actions && "whitespace-nowrap text-right", col.className)}
                >
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Loading placeholder with the same outer shape as DataTable, so swapping in
// real rows doesn't shift the layout.
export function TableSkeleton({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div
      className={cn("divide-y divide-outline-variant/15 rounded-[3px] border border-outline-variant/25", className)}
      aria-busy="true"
    >
      <span className="sr-only" role="status">
        Loading…
      </span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          <div className="h-3.5 w-1/4 animate-pulse rounded bg-surface-container" />
          <div className="h-3.5 w-1/5 animate-pulse rounded bg-surface-container" />
          <div className="ml-auto h-3.5 w-16 animate-pulse rounded bg-surface-container" />
        </div>
      ))}
    </div>
  );
}
