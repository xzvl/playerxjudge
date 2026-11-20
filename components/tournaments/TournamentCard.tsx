"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, Clock, MapPin, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BattleTypeBadge, TournamentTypeBadge } from "@/components/tournaments/badges";
import { TournamentThumbnail } from "@/components/tournaments/TournamentThumbnail";
import { PreRegisterDialog } from "@/components/tournaments/PreRegisterDialog";
import { formatDate, formatTime } from "@/lib/format";
import type { MockTournament } from "@/lib/mock/tournaments";

export function TournamentCard({
  tournament,
  onOpenDetails,
}: {
  tournament: MockTournament;
  onOpenDetails: (id: string) => void;
}) {
  const [preRegisterOpen, setPreRegisterOpen] = useState(false);
  // Whether the group stage/final bracket has actually generated matches —
  // not just whether the scheduled start time has passed — see
  // MockTournament.stageStarted.
  const hasStarted = tournament.stageStarted ?? false;
  const completed = tournament.liveStatus === "completed";
  const actionLabel = completed ? "View Result" : "Go Shoot!";
  const actionTooltip = completed ? "See the final results" : "Watch this tournament live";

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[3px] border border-outline-variant/25 bg-surface-container-low transition-all duration-200 hover:-translate-y-1 hover:border-primary/60 hover:shadow-[0_12px_32px_-12px_rgb(var(--m3-primary)/0.5)]">
      <span aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-10 h-0.5 w-0 bg-primary shadow-[0_0_10px_rgb(var(--m3-primary))] transition-all duration-300 group-hover:w-full" />
      <TournamentThumbnail
        color={tournament.thumbnailColor}
        title={tournament.title}
        imageUrl={tournament.thumbnailUrl}
        className="aspect-square border-b border-outline-variant/20"
      />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap gap-1.5">
          <BattleTypeBadge type={tournament.battleType} />
          <TournamentTypeBadge type={tournament.tournamentType} />
        </div>
        <h3 className="heading text-xl leading-[1.05]">{tournament.title}</h3>
        <p className="line-clamp-2 text-[13px] text-on-surface/60">{tournament.shortDescription}</p>

        <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-outline-variant/20 pt-3 font-mono text-[11px] text-on-surface/55">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            <dt className="sr-only">Date</dt>
            <dd>{formatDate(tournament.startsAt)}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            <dt className="sr-only">Time</dt>
            <dd>{formatTime(tournament.startsAt)}</dd>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            <dt className="sr-only">Location</dt>
            <dd className="line-clamp-1">{tournament.locationName}</dd>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            <dt className="sr-only">Organizer</dt>
            <dd className="line-clamp-1">{tournament.organizerName}</dd>
          </div>
        </dl>

        <div className="mt-auto flex flex-wrap gap-2 pt-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            tooltip="Preview this tournament without leaving the list"
            onClick={() => onOpenDetails(tournament.id)}
          >
            Quick Look
          </Button>
          <Button asChild variant="outline" size="sm" className="flex-1" tooltip="View the full tournament page">
            <Link href={`/tournaments/${tournament.slug}`}>Full Details</Link>
          </Button>
          {hasStarted ? (
            <Button asChild size="sm" className="flex-1" tooltip={actionTooltip}>
              <Link href={`/tournaments/${tournament.slug}/player`}>{actionLabel}</Link>
            </Button>
          ) : (
            <Button
              size="sm"
              className="flex-1"
              tooltip="Pre-register for this tournament"
              onClick={() => setPreRegisterOpen(true)}
            >
              Pre-register
            </Button>
          )}
        </div>
      </div>

      <PreRegisterDialog tournament={tournament} open={preRegisterOpen} onOpenChange={setPreRegisterOpen} />
    </article>
  );
}
