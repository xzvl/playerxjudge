"use client";

import { useState, useTransition, type ReactNode } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const [pending, startTransition] = useTransition();

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
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!pending) setOpen(next);
          if (!next) setError(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          {error ? <p className="px-5 text-[13px] text-primary">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" variant={destructive ? "destructive" : "default"} onClick={run} disabled={pending}>
              {pending ? "Working…" : confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
