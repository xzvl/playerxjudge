import Link from "next/link";
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
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="glass-panel max-w-md p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center border border-outline-variant/40">
          <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
        </div>
        <h1 className="heading mt-6 text-2xl">{title}</h1>
        <p className="mt-3 text-sm text-on-surface/60">{description}</p>
        <Link
          href={applyHref}
          className="mt-6 inline-block border border-primary px-6 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
        >
          {applyLabel}
        </Link>
      </div>
    </div>
  );
}
