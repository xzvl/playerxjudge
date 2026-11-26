import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// Save / Cancel footer for long forms. Sticks to the bottom of the viewport
// so the primary action stays reachable, sits above the mobile tab bar and
// the device safe area (below lg), and is in normal flow so it never covers
// content. Put Cancel first and the primary button last; buttons go full
// width on phones.
export function StickyActionBar({ children, status, className }: { children: ReactNode; status?: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 -mx-4 mt-6 flex flex-col-reverse gap-2 border-t border-outline-variant/25 bg-surface/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-end lg:bottom-0 lg:mx-0 lg:rounded-[3px] lg:border lg:px-4 max-sm:[&>button]:w-full",
        className
      )}
    >
      {status ? <div className="min-w-0 text-[13px] sm:mr-auto">{status}</div> : null}
      {children}
    </div>
  );
}
