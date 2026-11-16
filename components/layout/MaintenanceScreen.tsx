import Link from "next/link";
import { Wrench } from "lucide-react";

import { BrandLogo } from "@/components/layout/BrandLogo";
import type { MaintenanceContent } from "@/lib/site-content/schema";

// Shown in place of every public page while maintenance mode is on (see
// app/layout.tsx). Staff still see the real site, and /backend, /login and
// the auth callbacks stay reachable so staff can sign in and turn it off.
export function MaintenanceScreen({ content, email }: { content: MaintenanceContent; email: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16 text-center text-on-surface">
      <BrandLogo width={160} height={18} />
      <span className="mt-10 flex h-10 w-10 items-center justify-center rounded-md border border-outline-variant/30 bg-surface-container-low">
        <Wrench className="h-4 w-4 text-on-surface/60" aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{content.title}</h1>
      {content.message ? (
        <p className="mt-2 max-w-md whitespace-pre-line text-[15px] text-on-surface/60">{content.message}</p>
      ) : null}
      {email ? (
        <p className="mt-6 text-[13px] text-on-surface/50">
          Questions?{" "}
          <a href={`mailto:${email}`} className="text-on-surface underline-offset-4 hover:underline">
            {email}
          </a>
        </p>
      ) : null}
      <Link href="/login" className="mt-10 text-xs text-on-surface/40 transition-colors hover:text-on-surface/70">
        Staff sign in
      </Link>
    </div>
  );
}
