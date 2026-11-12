import Link from "next/link";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { Clock3, ShieldQuestion, XCircle } from "lucide-react";

export function RoleApplicationGate({
  roleLabel,
  status,
  applyHref,
  applyLabel,
}: {
  roleLabel: string;
  status: "pending" | "rejected" | null;
  applyHref: string;
  applyLabel: string;
}) {
  const notApplied = status === null;
  const rejected = status === "rejected";
  const Icon = notApplied ? ShieldQuestion : rejected ? XCircle : Clock3;

  const title = notApplied
    ? `Become a ${roleLabel}`
    : rejected
      ? "Application not approved"
      : "Application pending review";

  const description = notApplied
    ? `You haven't applied to become a ${roleLabel.toLowerCase()} yet.`
    : rejected
      ? "Your application wasn't approved. Reach out to support if you think this is a mistake."
      : "An admin is reviewing your application. You'll get access as soon as it's approved.";

  return (
    <div className="app-shell min-h-screen bg-background text-on-surface">
      {/* This renders instead of DashboardShell (no approved role yet, so no
          sidebar to navigate with) — but the global site Header hides
          itself on every /account route (see Header.tsx / isAccountRoute)
          expecting the page to bring its own, so a minimal one goes here
          too, otherwise there'd be no way back to the rest of the site. */}
      <header className="flex h-12 items-center border-b border-outline-variant/20 px-4">
        <Link href="/" aria-label="PlayerXJudge home">
          <BrandLogo width={136} height={15} />
        </Link>
      </header>

      <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm rounded-lg border border-outline-variant/25 bg-surface-container-low p-6 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md border border-outline-variant/25 bg-surface-container">
            <Icon className="h-4 w-4 text-on-surface/70" aria-hidden="true" />
          </div>
          <h1 className="heading mt-4">{title}</h1>
          <p className="mt-1.5 text-[13px] text-on-surface/60">{description}</p>
          <Link
            href={applyHref}
            className="mt-5 inline-flex h-8 items-center rounded-md bg-primary px-3 text-[13px] font-medium text-on-primary transition-colors hover:bg-primary/90"
          >
            {applyLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
