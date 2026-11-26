"use client";

import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Label above the control, optional required marker, helper text, and the
// validation error directly below. When `children` is a single element and no
// `htmlFor` is given, an id is generated and wired onto it (`id`,
// `aria-describedby`, `aria-invalid`), so callers don't pair label/htmlFor by
// hand. Pass `htmlFor` if the control already owns its id.
export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const generated = useId();
  // A control that already owns an id keeps it; otherwise one is generated.
  const childId = isValidElement(children) ? (children.props as { id?: string }).id : undefined;
  const id = htmlFor ?? childId ?? generated;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  const control =
    !htmlFor && isValidElement(children)
      ? cloneElement(children as ReactElement<Record<string, unknown>>, {
          id,
          "aria-describedby": describedBy,
          "aria-invalid": error ? true : undefined,
          "aria-required": required || undefined,
        })
      : children;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required ? (
          <>
            <span className="ml-0.5 text-primary" aria-hidden="true">
              *
            </span>
            <span className="sr-only"> (required)</span>
          </>
        ) : null}
      </Label>
      {control}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-primary">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-on-surface/50">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
