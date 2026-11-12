import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full border border-outline-variant/40 bg-surface-container-low px-4 py-2 text-sm text-on-surface placeholder:text-on-surface/40 transition-colors focus-visible:outline-none focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 erp:h-8 erp:rounded-md erp:border-outline-variant/35 erp:bg-surface-container-lowest erp:px-2.5 erp:py-1 erp:text-[13px] erp:focus-visible:border-primary/70 erp:focus-visible:ring-2 erp:focus-visible:ring-primary/15",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
