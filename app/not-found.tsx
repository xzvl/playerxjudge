import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="cyber-grid flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 text-center">
      <Compass className="h-10 w-10 text-primary" aria-hidden="true" />
      <h1 className="heading mt-6 text-5xl">404</h1>
      <p className="mt-3 max-w-sm text-on-surface/60">
        This page spun out of the arena. Let&apos;s get you back on track.
      </p>
      <Button asChild size="lg" className="mt-8">
        <Link href="/">Back to Home</Link>
      </Button>
    </div>
  );
}
