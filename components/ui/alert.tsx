import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

// The one inline feedback banner (form results, action errors, notices).
// Icon + text, so status never relies on color alone. Errors use
// role="alert" (announced immediately); the rest use role="status".
const TONES = {
  error: { icon: XCircle, box: "border-primary/40 bg-primary/10", iconColor: "text-primary", role: "alert" },
  success: { icon: CheckCircle2, box: "border-emerald-400/30 bg-emerald-400/10", iconColor: "text-emerald-400", role: "status" },
  warning: { icon: AlertTriangle, box: "border-amber-400/30 bg-amber-400/10", iconColor: "text-amber-400", role: "status" },
  info: { icon: Info, box: "border-tertiary/30 bg-tertiary/10", iconColor: "text-tertiary", role: "status" },
} as const;

export type InlineAlertTone = keyof typeof TONES;

export function InlineAlert({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: InlineAlertTone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const t = TONES[tone];
  const Icon = t.icon;
  return (
    <div
      role={t.role}
      className={cn("flex items-start gap-2.5 rounded-[3px] border px-3 py-2.5 text-[13px] text-on-surface", t.box, className)}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", t.iconColor)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title && "mt-0.5 text-on-surface/70")}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
