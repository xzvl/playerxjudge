import type { ReactNode } from "react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusTone = "success" | "danger" | "warning" | "info" | "neutral" | "accent";

const TONE_VARIANT: Record<StatusTone, NonNullable<BadgeProps["variant"]>> = {
  success: "success",
  danger: "destructive",
  warning: "emergency",
  info: "minor",
  neutral: "outline",
  accent: "default",
};

const TONE_DOT: Record<StatusTone, string> = {
  success: "bg-emerald-400",
  danger: "bg-primary",
  warning: "bg-amber-400",
  info: "bg-tertiary",
  neutral: "bg-on-surface/40",
  accent: "bg-primary",
};

// A status pill with a leading dot, so state reads from its label and shape
// as well as its color. Tones map onto the Badge variants.
export function StatusBadge({ tone = "neutral", children, className }: { tone?: StatusTone; children: ReactNode; className?: string }) {
  return (
    <Badge variant={TONE_VARIANT[tone]} className={cn("gap-1.5", className)}>
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 shrink-0 rounded-full", TONE_DOT[tone])} />
      {children}
    </Badge>
  );
}
