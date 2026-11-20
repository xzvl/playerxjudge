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
    <div className="hud-aurora relative flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 py-12 max-lg:pb-tabbar">
      <div aria-hidden="true" className="hud-grid pointer-events-none absolute inset-0" />
      <div className="relative w-full max-w-sm">
        <div className="chamfer relative border border-primary/30 bg-surface-container-low/90 p-6 shadow-[0_0_60px_-20px_rgb(var(--m3-primary)/0.6)] backdrop-blur-xl sm:p-7">
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-primary via-primary/40 to-transparent" />
          <p className="label-mono flex items-center gap-2 text-primary">
            <span className="live-dot" aria-hidden="true" /> PlayerXJudge
          </p>
          <h1 className="heading mt-2 text-4xl italic">{title}</h1>
          <p className="mt-2 text-[13px] text-on-surface/60">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        {footer ? <div className="mt-4 text-center text-[13px] text-on-surface/60">{footer}</div> : null}
      </div>
    </div>
  );
}
