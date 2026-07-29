import Link from "next/link";
import { CalendarDays, MapPin, MessageSquare, Trophy, Users } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BattleTypeBadge, TournamentTypeBadge } from "@/components/tournaments/badges";
import { TournamentThumbnail } from "@/components/tournaments/TournamentThumbnail";
import { CountdownTimer } from "@/components/tournaments/CountdownTimer";
import { formatCurrency, formatDate, formatTime } from "@/lib/format";
import type { MockTournament } from "@/lib/mock/tournaments";

export function TournamentDetailsModal({
  tournament,
  open,
  onOpenChange,
}: {
  tournament: MockTournament | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!tournament) return null;

  const liveStatusLabel: Record<MockTournament["liveStatus"], string> = {
    not_started: "Not Started",
    ongoing: "Live Now",
    completed: "Completed",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0">
        <TournamentThumbnail color={tournament.thumbnailColor} title={tournament.title} className="h-52" />

        <div className="space-y-8 p-6">
          <DialogHeader className="space-y-3 p-0 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <BattleTypeBadge type={tournament.battleType} />
              <TournamentTypeBadge type={tournament.tournamentType} />
              <span
                className={`label-mono px-2 py-1 ${
                  tournament.liveStatus === "ongoing" ? "animate-blink text-primary" : "text-on-surface/50"
                }`}
              >
                {liveStatusLabel[tournament.liveStatus]}
              </span>
            </div>
            <DialogTitle>{tournament.title}</DialogTitle>
            <DialogDescription>{tournament.description}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-8 lg:col-span-2">
              <section aria-labelledby="rules-heading">
                <h3 id="rules-heading" className="label-mono mb-3 text-primary">
                  Rules
                </h3>
                <ul className="list-inside list-disc space-y-1.5 text-sm text-on-surface/70">
                  {tournament.rules.map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
              </section>

              <Separator />

              <section aria-labelledby="participants-heading">
                <h3 id="participants-heading" className="label-mono mb-3 flex items-center gap-2 text-primary">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" /> Participants
                </h3>
                {tournament.participants.length > 0 ? (
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {tournament.participants.map((p) => (
                      <li
                        key={p.name}
                        className="border border-outline-variant/25 px-3 py-2 text-sm text-on-surface/70"
                      >
                        #{p.seed} {p.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-on-surface/50">Registration is still open — no participants yet.</p>
                )}
              </section>

              <Separator />

              <section aria-labelledby="brackets-heading">
                <h3 id="brackets-heading" className="label-mono mb-3 text-primary">
                  Brackets
                </h3>
                <p className="border border-dashed border-outline-variant/30 p-6 text-center text-sm text-on-surface/40">
                  Bracket visualization becomes available once the tournament starts.
                </p>
              </section>

              <Separator />

              <section aria-labelledby="comments-heading">
                <h3
                  id="comments-heading"
                  className="label-mono mb-3 flex items-center gap-2 text-primary"
                >
                  <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" /> Comments
                </h3>
                <p className="text-sm text-on-surface/50">
                  Sign in to join the discussion for this tournament.
                </p>
              </section>
            </div>

            <div className="space-y-6">
              <div className="border border-outline-variant/25 p-4">
                <p className="label-mono mb-3 text-on-surface/40">Countdown</p>
                <CountdownTimer target={tournament.startsAt} />
              </div>

              <dl className="space-y-3 border border-outline-variant/25 p-4 text-sm">
                <div className="flex items-center gap-2 text-on-surface/70">
                  <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <dd>
                    {formatDate(tournament.startsAt)} · {formatTime(tournament.startsAt)}
                  </dd>
                </div>
                <div className="flex items-center gap-2 text-on-surface/70">
                  <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <dd>{tournament.locationName}</dd>
                </div>
                <div className="flex items-center gap-2 text-on-surface/70">
                  <Trophy className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <dd>{formatCurrency(tournament.prizePool)} prize pool</dd>
                </div>
              </dl>

              <div className="border border-outline-variant/25 p-4">
                <p className="label-mono mb-2 text-on-surface/40">Organizer</p>
                <p className="text-sm text-on-surface">{tournament.organizerName}</p>
              </div>

              <div className="border border-outline-variant/25 p-4">
                <p className="label-mono mb-2 text-on-surface/40">Judges</p>
                <ul className="space-y-1 text-sm text-on-surface/70">
                  {tournament.judges.map((j) => (
                    <li key={j}>{j}</li>
                  ))}
                </ul>
              </div>

              {tournament.sponsors.length > 0 ? (
                <div className="border border-outline-variant/25 p-4">
                  <p className="label-mono mb-2 text-on-surface/40">Sponsors</p>
                  <div className="flex flex-wrap gap-2">
                    {tournament.sponsors.map((s) => (
                      <span key={s} className="label-mono border border-outline-variant/30 px-2 py-1">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="border border-outline-variant/25 p-4">
                <p className="label-mono mb-2 text-on-surface/40">Location</p>
                <p className="mb-3 text-sm text-on-surface/70">{tournament.province}</p>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={`/map?tournament=${tournament.slug}`}>View on Map</Link>
                </Button>
              </div>

              <Button asChild size="lg" className="w-full">
                <Link href={`/tournaments/${tournament.slug}/register`}>Register Now</Link>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
