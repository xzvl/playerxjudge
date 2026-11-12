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
    <div className="min-h-[calc(100vh-3.5rem)] px-4 py-12 md:px-6">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md border border-outline-variant/25 bg-surface-container-low">
          <Icon className="h-4 w-4 text-on-surface/70" aria-hidden="true" />
        </div>
        <p className="label-mono mt-4 text-on-surface/50">{eyebrow}</p>
        <h1 className="heading mt-1 text-2xl md:text-3xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-xl text-on-surface/60">{description}</p>
        {children ? <div className="mt-10">{children}</div> : null}
      </div>
    </div>
  );
}
