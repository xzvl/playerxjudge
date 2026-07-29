import Link from "next/link";
import { CalendarDays, Clock, MapPin, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BattleTypeBadge, TournamentTypeBadge } from "@/components/tournaments/badges";
import { TournamentThumbnail } from "@/components/tournaments/TournamentThumbnail";
import { formatDate, formatTime } from "@/lib/format";
import type { MockTournament } from "@/lib/mock/tournaments";

export function TournamentCard({
  tournament,
  onOpenDetails,
}: {
  tournament: MockTournament;
  onOpenDetails: (id: string) => void;
}) {
  const hasStarted = new Date(tournament.startsAt).getTime() <= Date.now();

  return (
    <article className="group flex flex-col border border-outline-variant/25 bg-surface-container-low transition-all hover:border-primary/40">
      <TournamentThumbnail color={tournament.thumbnailColor} title={tournament.title} className="h-40" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap gap-2">
          <BattleTypeBadge type={tournament.battleType} />
          <TournamentTypeBadge type={tournament.tournamentType} />
        </div>
        <h3 className="heading text-lg leading-tight">{tournament.title}</h3>
        <p className="line-clamp-2 text-sm text-on-surface/60">{tournament.shortDescription}</p>

        <dl className="mt-1 space-y-1.5 text-xs text-on-surface/50">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <dt className="sr-only">Date</dt>
            <dd>{formatDate(tournament.startsAt)}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <dt className="sr-only">Time</dt>
            <dd>{formatTime(tournament.startsAt)}</dd>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <dt className="sr-only">Location</dt>
            <dd className="line-clamp-1">{tournament.locationName}</dd>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <dt className="sr-only">Organizer</dt>
            <dd className="line-clamp-1">{tournament.organizerName}</dd>
          </div>
        </dl>

        <div className="mt-auto flex gap-2 pt-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onOpenDetails(tournament.id)}
          >
            Full Details
          </Button>
          {hasStarted ? (
            <Button asChild size="sm" className="flex-1">
              <Link href={`/tournaments/${tournament.slug}/live`}>Go Shoot!</Link>
            </Button>
          ) : (
            <Button asChild size="sm" className="flex-1">
              <Link href={`/tournaments/${tournament.slug}/register`}>Pre-register</Link>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
