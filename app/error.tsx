"use client";

import { RouteErrorPanel } from "@/components/dashboard/RouteErrorPanel";

// Catches errors anywhere below the root layout, including the /account and
// /backend layouts (shell) themselves, which their own error.tsx can't.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="px-4 py-16">
      <RouteErrorPanel error={error} reset={reset} />
    </div>
  );
}
