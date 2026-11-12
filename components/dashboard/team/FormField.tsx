import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-primary">{error}</p>
      ) : hint ? (
        <p className="text-xs text-on-surface/45">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormStatus({ status, message }: { status: "success" | "error" | null; message?: string | null }) {
  if (!status || !message) return null;
  return (
    <p role="status" className={cn("text-[13px]", status === "error" ? "text-primary" : "text-emerald-500")}>
      {message}
    </p>
  );
}
