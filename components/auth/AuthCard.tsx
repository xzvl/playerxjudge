import Link from "next/link";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="cyber-grid flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
      <div className="glass-panel w-full max-w-md p-8">
        <Link href="/" className="label-mono text-primary">
          PlayerXJudge
        </Link>
        <h1 className="heading mt-4 text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-on-surface/60">{subtitle}</p>
        <div className="mt-8">{children}</div>
        {footer ? <div className="mt-6 text-center text-sm text-on-surface/60">{footer}</div> : null}
      </div>
    </div>
  );
}
