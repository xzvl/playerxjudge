"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

// Shared body for the dashboards' error.tsx boundaries: instead of Next's
// generic "Application error" page (which takes the whole shell down), the
// sidebar stays, the actual error message shows, and the page can retry.
export function RouteErrorPanel({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center rounded-lg border border-outline-variant/25 bg-surface-container-low px-6 py-10 text-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-md border border-outline-variant/25 bg-surface-container-lowest">
        <TriangleAlert className="h-4 w-4 text-primary" aria-hidden="true" />
      </span>
      <h1 className="mt-3 text-sm font-medium">This page hit an error</h1>
      <p className="mt-1 text-[13px] text-on-surface/55">Try again. If it keeps happening, send this message to support:</p>
      <pre className="mt-3 max-h-40 w-full overflow-auto whitespace-pre-wrap break-words rounded-md border border-outline-variant/25 bg-surface-container-lowest p-3 text-left font-mono text-xs text-on-surface/80">
        {error.message || "Unknown error"}
        {error.digest ? `\nDigest: ${error.digest}` : ""}
      </pre>
      <Button type="button" className="mt-4" onClick={reset}>
        <RotateCcw /> Try again
      </Button>
    </div>
  );
}
