import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full border border-outline-variant/40 bg-surface-container-low px-4 py-2 text-sm text-on-surface placeholder:text-on-surface/40 transition-colors focus-visible:outline-none focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 erp:h-11 erp:rounded-[3px] erp:border-outline-variant/40 erp:bg-surface-container-lowest erp:px-3 erp:py-1 erp:text-base erp:focus-visible:border-primary erp:focus-visible:ring-2 erp:focus-visible:ring-primary/25 erp:focus-visible:shadow-[0_0_16px_-4px_rgb(var(--m3-primary)/0.6)] erp:lg:h-9 erp:lg:text-[13px]",
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
