import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-24 w-full border border-outline-variant/40 bg-surface-container-low px-4 py-3 text-sm text-on-surface placeholder:text-on-surface/40 transition-colors focus-visible:outline-none focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 erp:min-h-20 erp:rounded-md erp:border-outline-variant/35 erp:bg-surface-container-lowest erp:px-2.5 erp:py-2 erp:text-[13px] erp:focus-visible:border-primary/70 erp:focus-visible:ring-2 erp:focus-visible:ring-primary/15",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
