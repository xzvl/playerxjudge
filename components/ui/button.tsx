import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const buttonVariants = cva(
  // `erp:` classes are the dashboard look (compact, sentence case, rounded);
  // the unprefixed ones stay the marketing site's look.
  "inline-flex items-center justify-center whitespace-nowrap font-mono uppercase tracking-[0.15em] text-[11px] font-medium transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 erp:gap-1.5 erp:rounded-md erp:font-sans erp:text-[13px] erp:normal-case erp:tracking-normal erp:transition-colors erp:focus-visible:ring-offset-1 erp:[&_svg]:size-3.5",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-on-primary hover:brightness-110 active:scale-95 erp:active:scale-100 erp:hover:brightness-100 erp:hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:brightness-110 erp:hover:brightness-100 erp:hover:bg-destructive/90",
        outline:
          "border border-outline-variant/60 text-on-surface/70 hover:border-primary hover:text-primary bg-transparent erp:border-outline-variant/35 erp:bg-surface-container-low erp:text-on-surface erp:hover:border-outline-variant/60 erp:hover:bg-surface-container erp:hover:text-on-surface",
        secondary:
          "bg-surface-container text-on-surface hover:bg-surface-container-high",
        ghost:
          "hover:bg-white/5 text-on-surface/70 hover:text-on-surface erp:hover:bg-surface-container",
        link: "text-primary underline-offset-4 hover:underline normal-case tracking-normal",
      },
      size: {
        default: "h-11 px-4 lg:px-6 py-2 erp:h-8 erp:px-3 erp:py-0 erp:lg:px-3",
        sm: "h-9 px-4 erp:h-7 erp:px-2.5 erp:text-xs",
        lg: "h-14 px-8 text-xs erp:h-9 erp:px-4 erp:text-sm",
        icon: "h-10 w-10 erp:h-8 erp:w-8",
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
