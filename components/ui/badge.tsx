import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  // Dashboards (`erp:`) get soft tinted status pills instead of solid fills.
  "inline-flex items-center border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors focus:outline-none erp:gap-1 erp:rounded-[2px] erp:px-1.5 erp:py-px erp:font-mono erp:text-[10px] erp:font-semibold erp:uppercase erp:tracking-[0.12em]",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-on-primary erp:border-primary/30 erp:bg-primary/10 erp:text-primary",
        secondary: "border-transparent bg-surface-container-high text-on-surface",
        outline: "border-outline-variant/50 text-on-surface/70 erp:border-outline-variant/35",
        success: "border-transparent bg-emerald-600/90 text-white erp:border-emerald-400/30 erp:bg-emerald-400/10 erp:text-emerald-400",
        destructive: "border-transparent bg-error text-on-error erp:bg-primary/10 erp:text-primary",
        casual: "border-transparent bg-secondary-container text-on-secondary-container erp:bg-surface-container-high erp:text-on-surface/80",
        minor: "border-transparent bg-tertiary/90 text-on-tertiary erp:border-tertiary/30 erp:bg-tertiary/10 erp:text-tertiary",
        major: "border-transparent bg-primary text-on-primary erp:bg-primary/10 erp:text-primary",
        emergency: "border-transparent bg-error text-on-error erp:border-amber-400/30 erp:bg-amber-400/10 erp:text-amber-400",
        league: "border-transparent bg-indigo-600/90 text-white erp:border-violet-400/30 erp:bg-violet-400/10 erp:text-violet-300",
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
