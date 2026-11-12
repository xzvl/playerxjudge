import * as React from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

// The one search field style used across the site (header search, list
// filters, member/participant searches): 32px tall, rounded, a 14px
// magnifier inset at the left, 13px text. `wrapperClassName` sizes and
// positions the field (width, margins); `className` goes on the <input>.
const SearchInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & { wrapperClassName?: string }
>(({ className, wrapperClassName, type = "search", ...props }, ref) => (
  <div className={cn("relative", wrapperClassName)}>
    <Search
      aria-hidden="true"
      className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-on-surface/40"
    />
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-8 w-full rounded-md border border-outline-variant/30 bg-surface-container-low pl-8 pr-3 text-[13px] text-on-surface placeholder:text-on-surface/40 transition-colors focus-visible:border-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-search-cancel-button]:cursor-pointer",
        className
      )}
      {...props}
    />
  </div>
));
SearchInput.displayName = "SearchInput";

export { SearchInput };
