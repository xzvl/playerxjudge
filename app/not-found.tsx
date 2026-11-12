import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-md border border-outline-variant/25 bg-surface-container-low">
        <Compass className="h-4 w-4 text-on-surface/70" aria-hidden="true" />
      </span>
      <p className="mt-4 font-mono text-xs text-on-surface/45">404</p>
      <h1 className="heading mt-1 text-2xl">Page not found</h1>
      <p className="mt-2 max-w-sm text-[13px] text-on-surface/60">
        This page spun out of the arena. Let&apos;s get you back on track.
      </p>
      <Button asChild className="mt-6" tooltip="Return to the homepage">
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
