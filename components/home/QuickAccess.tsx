import Link from "next/link";
import { BookOpenCheck, CalendarDays, Trophy, Users2 } from "lucide-react";

const ITEMS = [
  { label: "Calendar", href: "/calendar", Icon: CalendarDays },
  { label: "Communities", href: "/communities", Icon: Users2 },
  { label: "Leaderboard", href: "/leaderboard", Icon: Trophy },
  { label: "Beyblade X Regulations", href: "/rules", Icon: BookOpenCheck },
];

export function QuickAccess() {
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-16 md:px-16" aria-labelledby="quick-access-heading">
      <h2 id="quick-access-heading" className="sr-only">
        Quick Access
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map(({ label, href, Icon }) => (
          <Link
            key={href}
            href={href}
            className="glitch-hover glass-panel group flex flex-col items-start gap-4 p-6 transition-transform hover:-translate-y-1"
          >
            <Icon className="h-8 w-8 text-primary transition-transform group-hover:scale-110" aria-hidden="true" />
            <span className="heading text-lg">{label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
