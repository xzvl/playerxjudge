import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

// Styled native <select>: keyboard/mobile-friendly with no portal, sized to
// match <Input> (marketing size by default, compact inside `.erp`).
const NativeSelect = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  ({ className, children, ...props }, ref) => (
    <span className="relative inline-flex w-full">
      <select
        ref={ref}
        className={cn(
          "h-11 w-full appearance-none border border-outline-variant/40 bg-surface-container-low pl-4 pr-9 text-sm text-on-surface transition-colors focus-visible:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 erp:h-8 erp:rounded-md erp:border-outline-variant/35 erp:bg-surface-container-lowest erp:pl-2.5 erp:pr-8 erp:text-[13px] erp:focus-visible:border-primary/70 erp:focus-visible:ring-2 erp:focus-visible:ring-primary/15",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-on-surface/45"
        aria-hidden="true"
      />
    </span>
  )
);
NativeSelect.displayName = "NativeSelect";

export { NativeSelect };
