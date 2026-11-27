import * as React from "react";
import { ChevronDown } from "lucide-react";

import { FIELD_BASE } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Styled native <select>: keyboard/mobile-friendly with no portal, same
// height and look as <Input>.
const NativeSelect = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  ({ className, children, ...props }, ref) => (
    <span className="relative inline-flex w-full">
      <select ref={ref} className={cn(FIELD_BASE, "appearance-none pl-3 pr-9", className)} {...props}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface/50"
        aria-hidden="true"
      />
    </span>
  )
);
NativeSelect.displayName = "NativeSelect";

export { NativeSelect };
