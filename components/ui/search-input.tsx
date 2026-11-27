import * as React from "react";
import { Search } from "lucide-react";

import { FIELD_BASE } from "@/components/ui/input";
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
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface/45"
    />
    <input
      ref={ref}
      type={type}
      className={cn(
        FIELD_BASE,
        "pl-9 pr-3 [&::-webkit-search-cancel-button]:cursor-pointer",
        className
      )}
      {...props}
    />
  </div>
));
SearchInput.displayName = "SearchInput";

export { SearchInput };
