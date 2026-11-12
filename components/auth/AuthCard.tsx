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
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="rounded-lg border border-outline-variant/25 bg-surface-container-low p-6">
          <h1 className="heading text-xl">{title}</h1>
          <p className="mt-1 text-[13px] text-on-surface/60">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        {footer ? <div className="mt-4 text-center text-[13px] text-on-surface/60">{footer}</div> : null}
      </div>
    </div>
  );
}
