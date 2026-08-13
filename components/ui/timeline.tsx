import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

// The vertical-line-and-dot timeline treatment originally built for the
// organizer's Log page (/account/organizer/tournament/[slug]/log) —
// factored out so the judge console's View Result popup and the
// organizer's own Match Details popup (GroupStageWorkspace.tsx) can read
// as the same "log" visual language instead of a plain bullet list.
export function Timeline({ children, className }: { children: React.ReactNode; className?: string }) {
  return <ol className={cn("space-y-0 border-l border-outline-variant/25", className)}>{children}</ol>;
}

export function TimelineItem({
  icon: Icon,
  caption,
  children,
}: {
  icon?: LucideIcon;
  caption?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="relative py-3 pl-6">
      <span className="absolute left-0 top-4 h-2 w-2 -translate-x-1/2 rounded-full bg-outline-variant/60" aria-hidden="true" />
      <p className="flex items-start gap-2 text-sm text-on-surface/80">
        {Icon ? <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-on-surface/30" aria-hidden="true" /> : null}
        <span>{children}</span>
      </p>
      {caption ? <p className="label-mono ml-6 mt-1 text-on-surface/30">{caption}</p> : null}
    </li>
  );
}
