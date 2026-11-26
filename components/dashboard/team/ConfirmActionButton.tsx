"use client";

import { useState, type ReactNode } from "react";
import { useBusyTransition } from "@/components/dashboard/DashboardBusy";

import { Button, type ButtonProps } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// A button that asks before running a destructive server action, and keeps
// the dialog open with the error if the action fails.
export function ConfirmActionButton({
  title,
  description,
  confirmLabel = "Confirm",
  onConfirm,
  onDone,
  children,
  variant = "outline",
  size = "sm",
  className,
  destructive = true,
  ...buttonProps
}: {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  onConfirm: () => Promise<{ status: "success" | "error"; message?: string }>;
  onDone?: () => void;
  children: ReactNode;
  destructive?: boolean;
} & Omit<ButtonProps, "onClick" | "children">) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useBusyTransition();

  const run = () =>
    startTransition(async () => {
      setError(null);
      const result = await onConfirm();
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setOpen(false);
      onDone?.();
    });

  return (
    <>
      <Button type="button" variant={variant} size={size} className={className} onClick={() => setOpen(true)} {...buttonProps}>
        {children}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setError(null);
        }}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        destructive={destructive}
        pending={pending}
        error={error}
        onConfirm={run}
      />
    </>
  );
}
