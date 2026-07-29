import type { LucideIcon } from "lucide-react";

export function PagePlaceholder({
  eyebrow,
  title,
  description,
  Icon,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  Icon: LucideIcon;
  children?: React.ReactNode;
}) {
  return (
    <div className="cyber-grid min-h-[calc(100vh-4rem)] px-4 py-20 md:px-16">
      <div className="mx-auto max-w-3xl text-center">
        <div className="glass-panel mx-auto flex h-16 w-16 items-center justify-center">
          <Icon className="h-7 w-7 text-primary" aria-hidden="true" />
        </div>
        <p className="label-mono mt-6 text-primary">{eyebrow}</p>
        <h1 className="heading mt-3 text-4xl md:text-5xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-xl text-on-surface/60">{description}</p>
        {children ? <div className="mt-10">{children}</div> : null}
      </div>
    </div>
  );
}
