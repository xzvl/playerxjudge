import * as React from "react";

import { cn } from "@/lib/utils";

// Shared field look for Input, NativeSelect, Combobox, SearchInput and the
// multi-select trigger: 40px tall, 3px radius, Barlow 15px, one focus ring.
export const FIELD_BASE =
  "h-10 w-full rounded-[3px] border border-outline-variant/40 bg-surface-container-lowest text-[15px] text-on-surface transition-colors placeholder:text-on-surface/40 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(FIELD_BASE, "flex px-3 py-1 file:border-0 file:bg-transparent", className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
