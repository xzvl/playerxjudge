import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Clock, Gavel, Handshake, MapPin, Trophy, User, UserPlus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BattleTypeBadge, TournamentTypeBadge } from "@/components/tournaments/badges";
import { TournamentThumbnail } from "@/components/tournaments/TournamentThumbnail";
import { CountdownTimer } from "@/components/tournaments/CountdownTimer";
import { VenueMapSection } from "@/components/tournaments/VenueMapSection";
import { TournamentPageActionButton } from "@/components/tournaments/TournamentPageActionButton";
import { formatDate, formatTime } from "@/lib/format";
import { getPublicTournamentBySlug } from "@/lib/tournaments/public-listings";
import type { MockTournament } from "@/lib/mock/tournaments";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tournament = await getPublicTournamentBySlug(slug);
  if (!tournament) return { title: "Tournament Not Found" };
  return {
    title: tournament.title,
    description: tournament.shortDescription,
  };
}

const LIVE_STATUS_LABEL: Record<MockTournament["liveStatus"], string> = {
  not_started: "Not Started",
  ongoing: "Live Now",
  completed: "Completed",
};

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "TBA";
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

export default async function TournamentDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tournament = await getPublicTournamentBySlug(slug);
  if (!tournament) notFound();

  const prizes = tournament.prizes ?? [];
  const rangeSections = tournament.prizeRangeSections ?? [];
  const hasPrizesToShow = tournament.prizeUsesRanges ? rangeSections.length > 0 : prizes.length > 0;
  const participantCount = tournament.participants.length;
  const completed = tournament.liveStatus === "completed";
  const hasStarted = new Date(tournament.startsAt).getTime() <= Date.now();
  const preRegisteredPlayers = tournament.preRegisteredPlayers ?? [];
  const showPreRegistered = !hasStarted && preRegisteredPlayers.length > 0;

  const fullAddress = [tournament.addressLine, tournament.city, tournament.province]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
  const hasPin = tournament.latitude !== 0 || tournament.longitude !== 0;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 md:px-16">
      <TournamentThumbnail
        color={tournament.thumbnailColor}
        title={tournament.title}
        imageUrl={tournament.bannerUrl}
        className="h-52 md:h-64"
      />

      <div className="mt-8 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <BattleTypeBadge type={tournament.battleType} />
          <TournamentTypeBadge type={tournament.tournamentType} />
          <span
            className={`label-mono px-2 py-1 ${
              tournament.liveStatus === "ongoing" ? "animate-blink text-primary" : "text-on-surface/50"
            }`}
          >
            {LIVE_STATUS_LABEL[tournament.liveStatus]}
          </span>
        </div>
        <h1 className="heading text-3xl md:text-4xl">{tournament.title}</h1>
        {tournament.description ? (
          <div
            className="prose-editor max-w-2xl text-sm text-on-surface/60 [&_a]:text-primary [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
            dangerouslySetInnerHTML={{ __html: tournament.description }}
          />
        ) : null}
      </div>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {hasPrizesToShow ? (
            <section aria-labelledby="prizes-heading">
              <h2 id="prizes-heading" className="label-mono mb-3 flex items-center gap-2 text-primary">
                <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> Prizes
              </h2>
              {tournament.prizeUsesRanges ? (
                <div className="space-y-5">
                  <p className="text-xs text-on-surface/50">Prizes vary by number of participants:</p>
                  {rangeSections.map((section, i) => {
                    const isCurrent = participantCount >= section.rangeStart && participantCount <= section.rangeEnd;
                    return (
                      <div key={i}>
                        <p className="label-mono mb-2 text-on-surface/60">
                          {section.rangeStart}–{section.rangeEnd} Participants
                          {isCurrent ? <span className="text-primary"> (current)</span> : null}
                        </p>
                        {section.prizes.length > 0 ? (
                          <ul className="grid gap-2 sm:grid-cols-2">
                            {section.prizes.map((p, j) => (
                              <li
                                key={j}
                                className="flex items-center gap-3 border border-outline-variant/25 px-3 py-2 text-sm"
                              >
                                <span className="text-on-surface/70">{p.placement}</span>
                                <span className="font-medium text-on-surface">{p.prizeName}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-on-surface/40">No prizes set for this range.</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {prizes.map((p) => (
                    <li
                      key={p.placement}
                      className="flex items-center gap-3 border border-outline-variant/25 px-3 py-2 text-sm"
                    >
                      <span className="text-on-surface/70">{p.placement}</span>
                      <span className="font-medium text-on-surface">{p.prizeName}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {hasPrizesToShow ? <Separator /> : null}

          {hasPin ? (
            <section aria-labelledby="venue-map-heading">
              <h2 id="venue-map-heading" className="label-mono mb-3 flex items-center gap-2 text-primary">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Venue
              </h2>
              <VenueMapSection lat={tournament.latitude} lng={tournament.longitude} />
            </section>
          ) : null}

          {hasPin ? <Separator /> : null}

          {showPreRegistered ? (
            <section aria-labelledby="pre-registered-heading">
              <h2 id="pre-registered-heading" className="label-mono mb-3 flex items-center gap-2 text-primary">
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" /> Pre-Registered ({preRegisteredPlayers.length})
              </h2>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {preRegisteredPlayers.map((p) => (
                  <li key={p.id} className="border border-outline-variant/25 px-3 py-2 text-sm text-on-surface/70">
                    {p.bladerName}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {showPreRegistered ? <Separator /> : null}

          <section aria-labelledby="participants-heading">
            <h2 id="participants-heading" className="label-mono mb-3 flex items-center gap-2 text-primary">
              <Users className="h-3.5 w-3.5" aria-hidden="true" /> Participants
            </h2>
            {tournament.participants.length > 0 ? (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {tournament.participants.map((p) => (
                  <li key={p.name} className="border border-outline-variant/25 px-3 py-2 text-sm text-on-surface/70">
                    #{p.seed} {p.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-on-surface/50">Registration is still open — no participants yet.</p>
            )}
          </section>
        </div>

        <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <TournamentPageActionButton tournament={tournament} hasStarted={hasStarted} completed={completed} />

          <div className="border border-outline-variant/25 p-4">
            <p className="label-mono mb-3 flex items-center gap-2 text-on-surface/40">
              <Clock className="h-4 w-4 shrink-0" aria-hidden="true" /> Countdown
            </p>
            <CountdownTimer target={tournament.startsAt} completed={completed} />
          </div>

          <div className="space-y-3 border border-outline-variant/25 p-4 text-sm">
            <p className="label-mono flex items-center gap-2 text-on-surface/40">
              <CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" /> Schedule
            </p>
            <div>
              <p className="text-xs text-on-surface/40">Pre-Registration Starts</p>
              <p className="text-on-surface/80">{formatDateTime(tournament.registrationStartsAt)}</p>
            </div>
            <div>
              <p className="text-xs text-on-surface/40">Pre-Registration Ends</p>
              <p className="text-on-surface/80">{formatDateTime(tournament.registrationDeadline)}</p>
            </div>
            <div>
              <p className="text-xs text-on-surface/40">Tournament Start</p>
              <p className="text-on-surface/80">{formatDateTime(tournament.startsAt)}</p>
            </div>
          </div>

          <div className="border border-outline-variant/25 p-4">
            <p className="label-mono mb-2 flex items-center gap-2 text-on-surface/40">
              <User className="h-4 w-4 shrink-0" aria-hidden="true" /> Organizer
            </p>
            <p className="text-sm text-on-surface">{tournament.organizerName}</p>
          </div>

          {tournament.judges.length > 0 ? (
            <div className="border border-outline-variant/25 p-4">
              <p className="label-mono mb-2 flex items-center gap-2 text-on-surface/40">
                <Gavel className="h-4 w-4 shrink-0" aria-hidden="true" /> Judges
              </p>
              <ul className="space-y-1 text-sm text-on-surface/70">
                {tournament.judges.map((j) => (
                  <li key={j}>{j}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {tournament.sponsors.length > 0 ? (
            <div className="border border-outline-variant/25 p-4">
              <p className="label-mono mb-2 flex items-center gap-2 text-on-surface/40">
                <Handshake className="h-4 w-4 shrink-0" aria-hidden="true" /> Sponsors
              </p>
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
            <p className="label-mono mb-2 flex items-center gap-2 text-on-surface/40">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" /> Location
            </p>
            <p className="text-sm text-on-surface">{tournament.locationName || "TBA"}</p>
            <p className="mb-3 mt-1 text-sm text-on-surface/60">{fullAddress || "Address not set"}</p>
            <Button asChild variant="outline" size="sm" className="w-full" tooltip="Show this venue on the map">
              <Link href={`/map?tournament=${tournament.slug}`}>View on Map</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
