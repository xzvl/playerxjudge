import Link from "next/link";
import { BookOpenCheck, CalendarDays, ChevronRight, Trophy, Users2 } from "lucide-react";

const ITEMS = [
  { label: "Calendar", description: "Upcoming events by date", href: "/calendar", Icon: CalendarDays },
  { label: "Communities", description: "Find a local community", href: "/communities", Icon: Users2 },
  { label: "Leaderboard", description: "Top players and rankings", href: "/leaderboard", Icon: Trophy },
  { label: "Beyblade X Regulations", description: "Official rules and formats", href: "/rules", Icon: BookOpenCheck },
];

export function QuickAccess() {
  return (
    <section className="mx-auto max-w-[1280px] px-4 py-8 md:px-6 md:py-10" aria-labelledby="quick-access-heading">
      <h2 id="quick-access-heading" className="sr-only">
        Quick access
      </h2>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {ITEMS.map(({ label, description, href, Icon }) => (
          <Link
            key={href}
            href={href}
            className="tap group relative flex flex-col gap-3 overflow-hidden rounded-[3px] border border-outline-variant/25 bg-surface-container-low p-4 transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:bg-surface-container sm:flex-row sm:items-center"
          >
            <span className="absolute inset-y-0 left-0 w-[3px] bg-outline-variant/40 transition-colors group-hover:bg-primary group-hover:shadow-[0_0_12px_rgb(var(--m3-primary))]" aria-hidden="true" />
            <span className="chamfer-sm flex h-11 w-11 shrink-0 items-center justify-center bg-primary/10 transition-colors group-hover:bg-primary/20">
              <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-lg font-semibold uppercase leading-tight tracking-[0.04em]">{label}</span>
              <span className="block truncate text-xs text-on-surface/50">{description}</span>
            </span>
            <ChevronRight className="hidden h-4 w-4 shrink-0 text-on-surface/30 transition-all group-hover:translate-x-0.5 group-hover:text-primary sm:block" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}
