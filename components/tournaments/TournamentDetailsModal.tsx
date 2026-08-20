"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, Clock, MapPin, Trophy, User } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BattleTypeBadge, TournamentTypeBadge } from "@/components/tournaments/badges";
import { TournamentThumbnail } from "@/components/tournaments/TournamentThumbnail";
import { CountdownTimer } from "@/components/tournaments/CountdownTimer";
import { PreRegisterDialog } from "@/components/tournaments/PreRegisterDialog";
import { formatDate, formatTime } from "@/lib/format";
import type { MockTournament } from "@/lib/mock/tournaments";

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "TBA";
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

// "Quick Look" — a deliberately short preview, not the whole tournament:
// type/tier, banner, title, description, prizes, an action button,
// countdown, the three key dates, organizer, and location. Everything else
// (rules, participants, judges, sponsors, brackets, comments) is
// full-page-only — see /tournaments/[slug], which "Full Details" links to.
export function TournamentDetailsModal({
  tournament,
  open,
  onOpenChange,
}: {
  tournament: MockTournament | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [preRegisterOpen, setPreRegisterOpen] = useState(false);
  // "Register Now" closes this outer dialog and opens PreRegisterDialog in
  // the same click — both state updates land in the same render, so the
  // parent's `tournament` prop goes null (it clears its selection on
  // close) at the same instant `preRegisterOpen` becomes true. Without this,
  // `if (!tournament) return null` below would unmount the whole component
  // — PreRegisterDialog included — before it ever got to open. Keeping the
  // last non-null tournament around lets the outer Dialog close normally
  // while the nested PreRegisterDialog keeps rendering.
  const [displayTournament, setDisplayTournament] = useState(tournament);

  useEffect(() => {
    if (tournament) setDisplayTournament(tournament);
  }, [tournament]);

  if (!displayTournament) return null;

  const prizes = displayTournament.prizes ?? [];
  const rangeSections = displayTournament.prizeRangeSections ?? [];
  const hasPrizesToShow = displayTournament.prizeUsesRanges ? rangeSections.length > 0 : prizes.length > 0;
  const participantCount = displayTournament.participants.length;
  const completed = displayTournament.liveStatus === "completed";
  // Whether the group stage/final bracket has actually generated matches —
  // not just whether the scheduled start time has passed — see
  // MockTournament.stageStarted.
  const hasStarted = displayTournament.stageStarted ?? false;
  const actionLabel = completed ? "View Result" : hasStarted ? "Go Shoot!" : "Register Now";
  const actionTooltip = completed ? "See the final results" : hasStarted ? "Watch this tournament live" : "Register for this tournament";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0">
        <TournamentThumbnail
          color={displayTournament.thumbnailColor}
          title={displayTournament.title}
          imageUrl={displayTournament.bannerUrl}
          className="h-52"
        />

        <div className="space-y-8 p-6">
          <DialogHeader className="space-y-3 p-0 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <BattleTypeBadge type={displayTournament.battleType} />
              <TournamentTypeBadge type={displayTournament.tournamentType} />
            </div>
            <DialogTitle>{displayTournament.title}</DialogTitle>
            {displayTournament.description ? (
              <div
                className="prose-editor text-sm text-on-surface/60 [&_a]:text-primary [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5"
                dangerouslySetInnerHTML={{ __html: displayTournament.description }}
              />
            ) : null}
          </DialogHeader>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-8 lg:col-span-2">
              {hasPrizesToShow ? (
                <section aria-labelledby="quick-look-prizes-heading">
                  <h3 id="quick-look-prizes-heading" className="label-mono mb-3 flex items-center gap-2 text-primary">
                    <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> Prizes
                  </h3>
                  {displayTournament.prizeUsesRanges ? (
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
                              <ul className="space-y-2">
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
                    <ul className="space-y-2">
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
              ) : (
                <p className="text-sm text-on-surface/50">No prizes have been posted yet.</p>
              )}
            </div>

            <div className="space-y-6">
              {hasStarted ? (
                <Button asChild size="lg" className="w-full" tooltip={actionTooltip}>
                  <Link href={`/tournaments/${displayTournament.slug}/player`}>{actionLabel}</Link>
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="w-full"
                  tooltip={actionTooltip}
                  onClick={() => {
                    onOpenChange(false);
                    setPreRegisterOpen(true);
                  }}
                >
                  {actionLabel}
                </Button>
              )}

              <div className="border border-outline-variant/25 p-4">
                <p className="label-mono mb-3 flex items-center gap-2 text-on-surface/40">
                  <Clock className="h-4 w-4 shrink-0" aria-hidden="true" /> Countdown
                </p>
                <CountdownTimer target={displayTournament.startsAt} completed={completed} />
              </div>

              <div className="space-y-3 border border-outline-variant/25 p-4 text-sm">
                <p className="label-mono flex items-center gap-2 text-on-surface/40">
                  <CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" /> Schedule
                </p>
                <div>
                  <p className="text-xs text-on-surface/40">Pre-Registration Starts</p>
                  <p className="text-on-surface/80">{formatDateTime(displayTournament.registrationStartsAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface/40">Pre-Registration Ends</p>
                  <p className="text-on-surface/80">{formatDateTime(displayTournament.registrationDeadline)}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface/40">Tournament Start</p>
                  <p className="text-on-surface/80">{formatDateTime(displayTournament.startsAt)}</p>
                </div>
              </div>

              <div className="border border-outline-variant/25 p-4">
                <p className="label-mono mb-2 flex items-center gap-2 text-on-surface/40">
                  <User className="h-4 w-4 shrink-0" aria-hidden="true" /> Organizer
                </p>
                <p className="text-sm text-on-surface">{displayTournament.organizerName}</p>
              </div>

              <div className="border border-outline-variant/25 p-4">
                <p className="label-mono mb-2 flex items-center gap-2 text-on-surface/40">
                  <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" /> Location
                </p>
                <p className="text-sm text-on-surface">{displayTournament.locationName || "TBA"}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>

      <PreRegisterDialog tournament={displayTournament} open={preRegisterOpen} onOpenChange={setPreRegisterOpen} />
    </Dialog>
  );
}
