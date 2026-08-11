import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement>;

// Plain native checkbox, styled to match the square/sharp design system.
// No Radix primitive needed for a simple checked/unchecked control — use
// with react-hook-form as `checked={field.value} onChange={(e) => field.onChange(e.target.checked)}`.
const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ className, ...props }, ref) => (
  <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
    <input
      type="checkbox"
      ref={ref}
      className={cn(
        "peer h-5 w-5 shrink-0 cursor-pointer appearance-none border border-outline-variant/50 bg-transparent transition-colors checked:border-primary checked:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
    <Check
      className="pointer-events-none absolute h-3.5 w-3.5 text-on-primary opacity-0 peer-checked:opacity-100"
      aria-hidden="true"
    />
  </span>
));
Checkbox.displayName = "Checkbox";

export { Checkbox };
