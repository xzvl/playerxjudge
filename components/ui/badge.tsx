import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-on-primary",
        secondary: "border-transparent bg-surface-container-high text-on-surface",
        outline: "border-outline-variant/50 text-on-surface/70",
        success: "border-transparent bg-emerald-600/90 text-white",
        casual: "border-transparent bg-secondary-container text-on-secondary-container",
        minor: "border-transparent bg-tertiary/90 text-on-tertiary",
        major: "border-transparent bg-primary text-on-primary",
        emergency: "border-transparent bg-error text-on-error",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
