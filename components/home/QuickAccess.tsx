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
    <section className="mx-auto max-w-[1280px] px-4 py-10 md:px-6" aria-labelledby="quick-access-heading">
      <h2 id="quick-access-heading" className="sr-only">
        Quick access
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map(({ label, description, href, Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-3 rounded-lg border border-outline-variant/25 bg-surface-container-low px-4 py-3 transition-colors hover:border-outline-variant/50 hover:bg-surface-container"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-outline-variant/25 bg-surface-container">
              <Icon className="h-4 w-4 text-on-surface/70" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">{label}</span>
              <span className="block truncate text-xs text-on-surface/50">{description}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-on-surface/30 transition-colors group-hover:text-on-surface/70" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}
