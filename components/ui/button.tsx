import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const buttonVariants = cva(
  // `erp:` classes are the dashboard look (compact, sentence case, rounded);
  // the unprefixed ones stay the marketing site's look.
  "inline-flex items-center justify-center whitespace-nowrap font-mono uppercase tracking-[0.15em] text-[11px] font-medium transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 erp:gap-1.5 erp:rounded-[3px] erp:font-display erp:text-[14px] erp:font-semibold erp:uppercase erp:tracking-[0.06em] erp:transition-all erp:focus-visible:ring-offset-1 erp:[&_svg]:size-4 erp:active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-on-primary hover:brightness-110 active:scale-95 erp:bg-primary erp:shadow-[0_0_0_1px_rgb(var(--m3-primary)/0.6),0_6px_20px_-8px_rgb(var(--m3-primary)/0.8)] erp:hover:bg-primary erp:hover:brightness-110 erp:hover:shadow-[0_0_0_1px_rgb(var(--m3-primary)/0.8),0_8px_28px_-6px_rgb(var(--m3-primary)/0.9)]",
        destructive:
          "bg-destructive text-destructive-foreground hover:brightness-110 erp:hover:brightness-100 erp:hover:bg-destructive/90",
        outline:
          "border border-outline-variant/60 text-on-surface/70 hover:border-primary hover:text-primary bg-transparent erp:border-outline-variant/40 erp:bg-surface-container-low/60 erp:text-on-surface erp:hover:border-primary/70 erp:hover:bg-primary/10 erp:hover:text-on-surface",
        secondary:
          "bg-surface-container text-on-surface hover:bg-surface-container-high",
        ghost:
          "hover:bg-white/5 text-on-surface/70 hover:text-on-surface erp:hover:bg-surface-container-high",
        link: "text-primary underline-offset-4 hover:underline normal-case tracking-normal",
      },
      size: {
        default: "h-11 px-4 lg:px-6 py-2 erp:h-10 erp:px-4 erp:py-0 erp:lg:h-9 erp:lg:px-4",
        sm: "h-9 px-4 erp:h-8 erp:px-3 erp:text-[13px]",
        lg: "h-14 px-8 text-xs erp:h-12 erp:px-6 erp:text-base erp:lg:h-11",
        icon: "h-10 w-10 erp:h-10 erp:w-10 erp:lg:h-9 erp:lg:w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  // Short description of what the button does, shown on hover/focus. Falls
  // back to `aria-label` when present (the common case for icon-only
  // buttons) so most call sites don't need to say the same thing twice.
  tooltip?: React.ReactNode;
  tooltipSide?: "top" | "bottom" | "left" | "right";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, tooltip, tooltipSide = "top", ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const content = tooltip ?? props["aria-label"];
    const button = (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );

    if (!content) return button;

    // A native `disabled` button ignores pointer events (see
    // `disabled:pointer-events-none` above), which would also swallow the
    // hover/focus that triggers the tooltip — exactly the case where a
    // tooltip explaining *why* it's disabled matters most. Wrapping it in a
    // span keeps the trigger hoverable without changing the button itself.
    const trigger = props.disabled ? <span className="inline-flex">{button}</span> : button;

    return (
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side={tooltipSide}>{content}</TooltipContent>
      </Tooltip>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
