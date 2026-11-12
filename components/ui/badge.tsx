import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  // Dashboards (`erp:`) get soft tinted status pills instead of solid fills.
  "inline-flex items-center border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors focus:outline-none erp:gap-1 erp:rounded erp:px-1.5 erp:py-px erp:font-sans erp:text-[11px] erp:font-medium erp:normal-case erp:tracking-normal",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-on-primary erp:bg-primary/10 erp:text-primary",
        secondary: "border-transparent bg-surface-container-high text-on-surface",
        outline: "border-outline-variant/50 text-on-surface/70 erp:border-outline-variant/35",
        success: "border-transparent bg-emerald-600/90 text-white erp:bg-emerald-500/10 erp:text-emerald-500",
        destructive: "border-transparent bg-error text-on-error erp:bg-primary/10 erp:text-primary",
        casual: "border-transparent bg-secondary-container text-on-secondary-container erp:bg-surface-container-high erp:text-on-surface/80",
        minor: "border-transparent bg-tertiary/90 text-on-tertiary erp:bg-sky-500/10 erp:text-sky-500",
        major: "border-transparent bg-primary text-on-primary erp:bg-primary/10 erp:text-primary",
        emergency: "border-transparent bg-error text-on-error erp:bg-amber-500/10 erp:text-amber-500",
        league: "border-transparent bg-indigo-600/90 text-white erp:bg-indigo-500/10 erp:text-indigo-400",
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
