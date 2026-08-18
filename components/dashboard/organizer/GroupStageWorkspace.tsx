"use client";

import { useEffect, useRef, useState, useTransition, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpCircle, Camera, Download, Eraser, Flame, Gavel, Maximize2, Minimize2, Info, Pencil, Play, Radio, RotateCw, Swords, Trophy, Zap } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { useDragScroll } from "@/lib/hooks/use-drag-scroll";
import { cn } from "@/lib/utils";
import { computeGroupStandings } from "@/lib/swiss";
import { TIE_BREAK_OPTIONS, type SwissPoints, type TieBreakMetric } from "@/lib/validations/tournament-wizard";
import {
  clearMatchResult,
  generateNextRound,
  reportMatchResult,
  startMatch,
  swapMatchParticipants,
  type MatchSlot,
} from "@/app/account/organizer/tournament/[slug]/matches-actions";
import type { FinishType, Match, MatchBattle, MatchScore, TournamentGroup, TournamentParticipant } from "@/lib/types/database";

// What's carried through the browser's native HTML5 drag-and-drop data
// transfer when an organizer drags a player's name off a match slot —
// picked up by whichever other slot it's dropped on (see
// MatchParticipantSlot) and forwarded to swapMatchParticipants as-is.
interface DragPayload {
  matchId: string;
  slot: MatchSlot;
  participantName: string;
}

export interface RosterLite {
  seed: number;
  name: string;
  teamName: string | null;
}

function isScore(value: Match["score"]): value is MatchScore {
  return typeof value === "object" && value !== null && "a" in value && "b" in value;
}

function initials(name: string) {
  const parts = name.replace(/^Team\s+/i, "").trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function tieBreakLabel(metric: TieBreakMetric): string {
  return TIE_BREAK_OPTIONS.find((o) => o.value === metric)?.label ?? metric;
}

// Buchholz sums other participants' scores, which can themselves be
// fractional (pointsPerMatchTie), so it always shows one decimal place —
// "1.0", not "1" — even when the current value happens to be a whole
// number, to read consistently as a score-like metric rather than a count.
function formatMetric(value: number, metric?: TieBreakMetric): string {
  if (metric === "median_buchholz") return value.toFixed(1);
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

const FINISH_LABEL: Record<FinishType, string> = { burst: "Burst", spin: "Spin", extreme: "Extreme", over: "Over" };

// Official point values (app/rules/page.tsx's Scoring System table) —
// first to 4 points wins. Used both by the judge console to tally live
// totals and here to narrate each battle's point award.
const FINISH_POINTS: Record<FinishType, number> = { spin: 1, over: 2, burst: 2, extreme: 3 };

// Mirrors PlayerScorePanel's own FINISH_ICON (components/tournaments/judge/PlayerScorePanel.tsx)
// — same per-battle icon in the live scorecard and here, in the submitted
// result's timeline.
const FINISH_ICON: Record<FinishType, typeof RotateCw> = { spin: RotateCw, over: ArrowUpCircle, burst: Zap, extreme: Flame };

function tallyFinishes(participantId: string | undefined, battles: MatchBattle[]): Record<FinishType, number> {
  const counts: Record<FinishType, number> = { spin: 0, over: 0, burst: 0, extreme: 0 };
  for (const battle of battles) {
    if (battle.winnerId === participantId) counts[battle.finishType] += 1;
  }
  return counts;
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// A participant name row, draggable: a name picked up here
// and dropped onto another eligible slot re-pairs the two matches (see
// swapMatchParticipants). `eligible` gates both ends of the drag — the
// match this slot belongs to needs to be unplayed and unlocked, same as the
// server re-checks — so a slot that can't be dragged also can't be dropped
// onto.
function MatchParticipantSlot({
  participant,
  isBye,
  matchId,
  slot,
  eligible,
  onSwap,
}: {
  participant: RosterLite | null;
  isBye?: boolean;
  matchId: string;
  slot: MatchSlot;
  eligible: boolean;
  onSwap: (from: DragPayload, to: DragPayload) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  if (isBye) return <span className="text-sm italic text-on-surface/40">Bye</span>;
  if (!participant) return <span className="text-sm text-on-surface/40">TBD</span>;

  const name = participant.teamName ?? participant.name;

  function handleDragStart(e: DragEvent<HTMLSpanElement>) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify({ matchId, slot, participantName: name } satisfies DragPayload));
  }

  function handleDragOver(e: DragEvent<HTMLSpanElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  }

  function handleDrop(e: DragEvent<HTMLSpanElement>) {
    e.preventDefault();
    setDragOver(false);
    let payload: DragPayload;
    try {
      payload = JSON.parse(e.dataTransfer.getData("application/json"));
    } catch {
      return;
    }
    if (payload.matchId === matchId && payload.slot === slot) return;
    onSwap(payload, { matchId, slot, participantName: name });
  }

  return (
    <span
      draggable={eligible}
      onDragStart={eligible ? handleDragStart : undefined}
      onDragOver={eligible ? handleDragOver : undefined}
      onDragLeave={eligible ? () => setDragOver(false) : undefined}
      onDrop={eligible ? handleDrop : undefined}
      title={eligible ? "Drag to swap with another player" : undefined}
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-sm text-sm transition-colors",
        eligible && "cursor-grab active:cursor-grabbing",
        dragOver && "bg-primary/10 ring-1 ring-primary/40"
      )}
    >
      <span className="text-xs flex h-6 w-6 shrink-0 items-center justify-center bg-surface-container-high text-on-surface/40">{participant.seed}</span>
      <span className="truncate text-xs text-on-surface">{name}</span>
    </span>
  );
}

function ScoreChip({ value, isWinner, isLoser }: { value: number; isWinner: boolean; isLoser: boolean }) {
  return (
    <span
      className={cn(
        "label-mono flex h-6 w-6 shrink-0 items-center justify-center",
        isWinner && "bg-primary/20 font-bold text-primary",
        isLoser && "bg-surface-container-high text-on-surface/40"
      )}
    >
      {value}
    </span>
  );
}

export function MatchDetailsDialog({ open, onOpenChange, match, participantsById }: { open: boolean; onOpenChange: (open: boolean) => void; match: Match | null; participantsById: Map<string, RosterLite> }) {
  if (!match) return null;
  const score = isScore(match.score) ? match.score : null;
  const a = match.participant_a_id ? participantsById.get(match.participant_a_id) : undefined;
  const b = match.participant_b_id ? participantsById.get(match.participant_b_id) : undefined;
  const winnerName = match.winner_id === match.participant_a_id ? a?.teamName ?? a?.name : b?.teamName ?? b?.name;
  const loserName = match.winner_id === match.participant_a_id ? b?.teamName ?? b?.name : a?.teamName ?? a?.name;

  const hi = (text: string) => <span className="font-semibold text-primary">{text}</span>;
  const strong = (text: string) => <span className="font-semibold text-on-surface">{text}</span>;

  const aName = a?.teamName ?? a?.name ?? "—";
  const bName = b?.teamName ?? b?.name ?? "—";
  const aCounts = score && score.battles ? tallyFinishes(match.participant_a_id ?? undefined, score.battles) : null;
  const bCounts = score && score.battles ? tallyFinishes(match.participant_b_id ?? undefined, score.battles) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Match Details</DialogTitle>
          <DialogDescription>
            Round {match.round}, Match {match.match_number}
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6 text-sm text-on-surface/80">
          {match.status !== "completed" || !score ? (
            <p className="text-on-surface/50">No result reported yet.</p>
          ) : score.battles && score.battles.length > 0 ? (
            <Timeline>
              {score.battles.map((battle, i) => {
                const winner = participantsById.get(battle.winnerId);
                const winnerBattleName = winner?.teamName ?? winner?.name ?? "—";
                const winnerIsA = battle.winnerId === match.participant_a_id;
                const loser = winnerIsA ? b : a;
                const loserBattleName = loser?.teamName ?? loser?.name ?? "—";
                const winnerCombo = (winnerIsA ? battle.participantACombo : battle.participantBCombo)?.name;
                const loserCombo = (winnerIsA ? battle.participantBCombo : battle.participantACombo)?.name;
                const points = FINISH_POINTS[battle.finishType];
                return (
                  <TimelineItem key={i} icon={FINISH_ICON[battle.finishType]}>
                    Battle {i + 1}: {hi(winnerBattleName)} [{winnerCombo ?? "Beyblade"}] wins by{" "}
                    {hi(`${FINISH_LABEL[battle.finishType]} Finish`)} against {strong(loserBattleName)} [{loserCombo ?? "Beyblade"}] and earns{" "}
                    {hi(`${points} point${points === 1 ? "" : "s"}`)}.
                  </TimelineItem>
                );
              })}
              <TimelineItem icon={Swords}>
                Battle Result: {hi(winnerName ?? "—")} defeated {strong(loserName ?? "—")}
              </TimelineItem >
              {aCounts && bCounts ? (
                <TimelineItem icon={Swords}>
                  Finishes: {strong(`${aName}:`)} [Spin: {aCounts.spin}, Over: {aCounts.over}, Burst: {aCounts.burst}, Extreme:{" "}
                  {aCounts.extreme}, Penalty: {score.penaltiesA ?? 0}]
                  <br />
                  {strong(`${bName}:`)} [Spin: {bCounts.spin}, Over: {bCounts.over}, Burst: {bCounts.burst}, Extreme: {bCounts.extreme}
                  , Penalty: {score.penaltiesB ?? 0}]
                </TimelineItem>
              ) : null}
              <TimelineItem icon={Trophy}>
                Final Score: {score.a} vs {score.b}
              </TimelineItem>
              {score.judgeName ? (
                <TimelineItem icon={Gavel}>
                  Judge: {hi(score.judgeName)} {score.judgeUsername ? <span className="text-primary">@{score.judgeUsername}</span> : null}
                </TimelineItem>
              ) : null}
              {score.station ? (
                <TimelineItem icon={Radio}>Station: {hi(score.station)}</TimelineItem>
              ) : null}
              {score.screenshotUrl ? (
                <TimelineItem icon={Camera}>
                  Match Screenshot:{" "}
                  <a href={score.screenshotUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                    {winnerName} vs {loserName}
                    {match.completed_at ? ` — ${new Date(match.completed_at).toLocaleString("en-PH")}` : ""}
                  </a>
                </TimelineItem>
              ) : null}
              <TimelineItem icon={Info}>{score.confirmedByBoth ? "Result confirmed by both players." : "Awaiting confirmation from both players."}</TimelineItem>
            </Timeline>
          ) : (
            <Timeline>
              <TimelineItem icon={Swords}>
                Battle Result: {hi(winnerName ?? "—")} defeated {strong(loserName ?? "—")}
              </TimelineItem>
              <TimelineItem icon={Trophy}>
                Final Score: {score.a} vs {score.b}
              </TimelineItem>
              <TimelineItem icon={Info}>Result is input by the Organizer/Staff and confirmed by both players.</TimelineItem>
            </Timeline>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ReportMatchDialog({ open, onOpenChange, match, participantsById, pending, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; match: Match | null; participantsById: Map<string, RosterLite>; pending: boolean; onSubmit: (scoreA: number, scoreB: number) => void }) {
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);

  useEffect(() => {
    if (!match) return;
    const score = isScore(match.score) ? match.score : { a: 0, b: 0 };
    setScoreA(score.a);
    setScoreB(score.b);
  }, [match]);

  if (!match) return null;
  const a = match.participant_a_id ? participantsById.get(match.participant_a_id) : undefined;
  const b = match.participant_b_id ? participantsById.get(match.participant_b_id) : undefined;
  const hasScore = isScore(match.score) && match.status === "completed";
  const aWinning = scoreA !== scoreB && scoreA > scoreB;
  const bWinning = scoreA !== scoreB && scoreB > scoreA;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{match.status === "completed" ? "Edit Result" : "Report Result"}</DialogTitle>
          <DialogDescription>
            Round {match.round}, Match {match.match_number}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-6 pb-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <Avatar className={cn("h-12 w-12 transition-shadow", aWinning && "ring-2 ring-primary")}>
              <AvatarFallback className={cn(aWinning && "bg-primary/20 text-primary")}>
                {initials(a?.teamName ?? a?.name ?? "?")}
              </AvatarFallback>
            </Avatar>
            <span className={cn("line-clamp-2 text-sm", aWinning ? "font-semibold text-primary" : "text-on-surface")}>
              {a?.teamName ?? a?.name ?? "TBD"}
            </span>
            {hasScore ? <span className="label-mono text-on-surface/40">{scoreA}</span> : null}
            <Input
              type="number"
              min={0}
              value={scoreA}
              onChange={(e) => setScoreA(Math.max(0, e.target.valueAsNumber || 0))}
              className="w-16 text-center"
            />
          </div>
          <span className="label-mono self-center text-on-surface/30">VS</span>
          <div className="flex flex-col items-center gap-2 text-center">
            <Avatar className={cn("h-12 w-12 transition-shadow", bWinning && "ring-2 ring-primary")}>
              <AvatarFallback className={cn(bWinning && "bg-primary/20 text-primary")}>
                {initials(b?.teamName ?? b?.name ?? "?")}
              </AvatarFallback>
            </Avatar>
            <span className={cn("line-clamp-2 text-sm", bWinning ? "font-semibold text-primary" : "text-on-surface")}>
              {b?.teamName ?? b?.name ?? "TBD"}
            </span>
            {hasScore ? <span className="label-mono text-on-surface/40">{scoreB}</span> : null}
            <Input
              type="number"
              min={0}
              value={scoreB}
              onChange={(e) => setScoreB(Math.max(0, e.target.valueAsNumber || 0))}
              className="w-16 text-center"
            />
          </div>
        </div>
        <DialogFooter className="p-6 pt-0">
          <Button type="button" tooltip="Save this match's score" disabled={pending} onClick={() => onSubmit(scoreA, scoreB)}>
            {pending ? "Saving..." : "Save Result"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// The Clear icon's confirmation — only ever opened on an already-completed
// match (see MatchRow/BracketMatchCard's own `hasScore` gate), so there's
// always a real result to describe here.
export function ClearResultDialog({
  open,
  onOpenChange,
  match,
  participantsById,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: Match | null;
  participantsById: Map<string, RosterLite>;
  pending: boolean;
  onConfirm: () => void;
}) {
  if (!match) return null;
  const a = match.participant_a_id ? participantsById.get(match.participant_a_id) : undefined;
  const b = match.participant_b_id ? participantsById.get(match.participant_b_id) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Clear this match&apos;s result?</DialogTitle>
          <DialogDescription>
            Round {match.round}, Match {match.match_number} — {a?.teamName ?? a?.name ?? "TBD"} vs {b?.teamName ?? b?.name ?? "TBD"}.
            This permanently deletes the reported score, battle history, and any screenshot — the match goes back to unplayed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="p-6 pt-0">
          <Button type="button" variant="destructive" tooltip="Permanently clear this match's result" disabled={pending} onClick={onConfirm}>
            {pending ? "Clearing..." : "Clear Result"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MatchRow({
  match,
  participantsById,
  pending,
  locked,
  canSwap,
  onStart,
  onReport,
  onDetails,
  onClear,
  onSwap,
}: {
  match: Match;
  participantsById: Map<string, RosterLite>;
  pending: boolean;
  locked: boolean;
  // Drag-and-drop re-pairing is admin/super_admin only — an organizer
  // running their own tournament no longer gets it (see
  // GroupStageWorkspace's own doc comment for why).
  canSwap: boolean;
  onStart: () => void;
  onReport: () => void;
  onDetails: () => void;
  onClear: () => void;
  onSwap: (from: DragPayload, to: DragPayload) => void;
}) {
  const a = match.participant_a_id ? participantsById.get(match.participant_a_id) ?? null : null;
  const isBye = match.participant_b_id === null;
  const b = isBye ? null : match.participant_b_id ? participantsById.get(match.participant_b_id) ?? null : null;
  const score = isScore(match.score) ? match.score : null;
  const aWins = score !== null && match.winner_id === match.participant_a_id;
  const bWins = score !== null && match.winner_id === match.participant_b_id;
  // Only an unplayed, unlocked match's names can be dragged or dropped onto
  // — matches swapMatchParticipants' own check — and only for staff.
  const swappable = !locked && match.status === "scheduled" && canSwap;

  return (
    <div
      className={cn(
        "group relative border lg:p-1",
        match.status === "ongoing" ? "border-primary/60 bg-primary/5" : "border-outline-variant/25 bg-surface-container-low"
      )}
    >
      <div className="flex min-h-[50px] items-center gap-3">
        <span className="w-6 shrink-0 text-center font-mono text-xs text-on-surface/40">{match.match_number}</span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center justify-between gap-2">
            <MatchParticipantSlot participant={a} matchId={match.id} slot="a" eligible={swappable && a !== null} onSwap={onSwap} />
            {score ? <ScoreChip value={score.a} isWinner={aWins} isLoser={bWins} /> : null}
          </div>
          <div className="flex items-center justify-between gap-2">
            <MatchParticipantSlot participant={b} isBye={isBye} matchId={match.id} slot="b" eligible={swappable && b !== null} onSwap={onSwap} />
            {score && !isBye ? <ScoreChip value={score.b} isWinner={bWins} isLoser={aWins} /> : null}
          </div>
        </div>
      </div>

      {!isBye ? (
        <div className="pointer-events-none absolute left-full top-1/2 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 z-20">
          <div className="flex items-center gap-1 border border-outline-variant/40 bg-surface-container-lowest p-1 shadow-lg">
            {!locked && match.status === "scheduled" ? (
              <Button type="button" variant="ghost" size="icon" aria-label="Start match" disabled={pending} onClick={onStart}>
                <Play className="h-3.5 w-3.5" />
              </Button>
            ) : null}
            {!locked ? (
              match.status !== "completed" ? (
                <Button type="button" variant="ghost" size="icon" aria-label="Report result" disabled={pending} onClick={onReport}>
                  <Swords className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button type="button" variant="ghost" size="icon" aria-label="Edit result" disabled={pending} onClick={onReport}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )
            ) : null}
            {!locked && match.status === "completed" ? (
              <Button type="button" variant="ghost" size="icon" aria-label="Clear result" disabled={pending} onClick={onClear}>
                <Eraser className="h-3.5 w-3.5" />
              </Button>
            ) : null}
            <Button type="button" variant="ghost" size="icon" aria-label="Match details" disabled={pending} onClick={onDetails}>
              <Info className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RoundColumn({
  round,
  matches,
  participantsById,
  pending,
  locked,
  canSwap,
  isGenerated,
  canGenerate,
  generating,
  onGenerate,
  onStart,
  onReport,
  onDetails,
  onClear,
  onSwap,
}: {
  round: number;
  matches: Match[];
  participantsById: Map<string, RosterLite>;
  pending: boolean;
  locked: boolean;
  canSwap: boolean;
  isGenerated: boolean;
  canGenerate: boolean;
  generating: boolean;
  onGenerate: () => void;
  onStart: (id: string) => void;
  onReport: (m: Match) => void;
  onDetails: (m: Match) => void;
  onClear: (m: Match) => void;
  onSwap: (from: DragPayload, to: DragPayload) => void;
}) {
  return (
    <div className="flex w-64 shrink-0 flex-col gap-3">
      <p className="label-mono sticky top-0 bg-surface py-1 text-center text-on-surface/40">Round {round}</p>
      {isGenerated ? (
        <div className="space-y-2">
          {matches.map((m) => (
            <MatchRow
              key={m.id}
              match={m}
              participantsById={participantsById}
              pending={pending}
              locked={locked}
              canSwap={canSwap}
              onStart={() => onStart(m.id)}
              onReport={() => onReport(m)}
              onDetails={() => onDetails(m)}
              onClear={() => onClear(m)}
              onSwap={onSwap}
            />
          ))}
        </div>
      ) : canGenerate && !locked ? (
        <div className="flex min-h-[8rem] flex-1 items-center justify-center border border-dashed border-outline-variant/40 p-4">
          <Button type="button" size="sm" tooltip={`Pair up Round ${round} from current standings`} disabled={generating} onClick={onGenerate}>
            {generating ? "Generating..." : `Generate Round ${round}`}
          </Button>
        </div>
      ) : (
        <div className="flex min-h-[8rem] flex-1 items-center justify-center border border-dashed border-outline-variant/20 p-4 text-center text-xs text-on-surface/30">
          Not yet available
        </div>
      )}
    </div>
  );
}

function MatchesTab({ groupId, tournamentId, slug, participants, matches, setMatches, swissRoundsCap, locked, canSwap }: { groupId: string; tournamentId: string; slug: string; participants: TournamentParticipant[]; matches: Match[]; setMatches: (updater: (prev: Match[]) => Match[]) => void; swissRoundsCap: number; locked: boolean; canSwap: boolean }) {
  const router = useRouter();
  const scrollRef = useDragScroll<HTMLDivElement>();
  const participantsById = new Map(participants.map((p) => [p.id, { seed: p.seed, name: p.name, teamName: p.team_name }]));

  const [reportingMatch, setReportingMatch] = useState<Match | null>(null);
  const [detailsMatch, setDetailsMatch] = useState<Match | null>(null);
  const [clearingMatch, setClearingMatch] = useState<Match | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [generating, startGenerating] = useTransition();

  const latestRound = matches.reduce((max, m) => Math.max(max, m.round), 0);
  const latestRoundMatches = matches.filter((m) => m.round === latestRound);
  const latestComplete = latestRoundMatches.length > 0 && latestRoundMatches.every((m) => m.status === "completed");

  function handleStart(matchId: string) {
    setError(null);
    startTransition(async () => {
      const result = await startMatch(matchId, slug);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, status: "ongoing" } : m)));
    });
  }

  function handleReportSubmit(scoreA: number, scoreB: number) {
    if (!reportingMatch) return;
    setError(null);
    startTransition(async () => {
      const result = await reportMatchResult(reportingMatch.id, slug, scoreA, scoreB);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      if (result.match) {
        const updated = result.match;
        setMatches((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      }
      setReportingMatch(null);
    });
  }

  function handleClearConfirm() {
    if (!clearingMatch) return;
    setError(null);
    startTransition(async () => {
      const result = await clearMatchResult(clearingMatch.id, slug);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      if (result.match) {
        const updated = result.match;
        setMatches((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      }
      setClearingMatch(null);
    });
  }

  function handleGenerateNext() {
    setError(null);
    startGenerating(async () => {
      const result = await generateNextRound(tournamentId, groupId, slug);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      if (result.matches) {
        const newMatches = result.matches;
        setMatches((prev) => [...prev, ...newMatches]);
      }
      router.refresh();
    });
  }

  function handleSwap(from: DragPayload, to: DragPayload) {
    setError(null);
    startTransition(async () => {
      const result = await swapMatchParticipants(slug, from, to);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      if (result.matches) {
        const updated = result.matches;
        setMatches((prev) => prev.map((m) => updated.find((u) => u.id === m.id) ?? m));
      }
    });
  }

  const rounds = Array.from({ length: swissRoundsCap }, (_, i) => i + 1);

  return (
    <div>
      {locked ? (
        <p className="mb-4 border border-outline-variant/25 bg-surface-container-low px-4 py-3 text-sm text-on-surface/60">
          The final stage has started — group stage results are locked.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mb-4 border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div
        ref={scrollRef}
        className="flex max-h-[85vh] lg:max-h-[75vh] cursor-grab select-none gap-6 overflow-auto px-1 pb-4 active:cursor-grabbing"
      >
        {rounds.map((r) => (
          <RoundColumn
            key={r}
            round={r}
            matches={matches.filter((m) => m.round === r).sort((x, y) => x.match_number - y.match_number)}
            participantsById={participantsById}
            pending={pending}
            locked={locked}
            canSwap={canSwap}
            isGenerated={r <= latestRound}
            canGenerate={r === latestRound + 1 && latestComplete}
            generating={generating}
            onGenerate={handleGenerateNext}
            onStart={handleStart}
            onReport={setReportingMatch}
            onDetails={setDetailsMatch}
            onClear={setClearingMatch}
            onSwap={handleSwap}
          />
        ))}
      </div>

      <ReportMatchDialog
        open={reportingMatch !== null}
        onOpenChange={(open) => !open && setReportingMatch(null)}
        match={reportingMatch}
        participantsById={participantsById}
        pending={pending}
        onSubmit={handleReportSubmit}
      />
      <MatchDetailsDialog
        open={detailsMatch !== null}
        onOpenChange={(open) => !open && setDetailsMatch(null)}
        match={detailsMatch}
        participantsById={participantsById}
      />
      <ClearResultDialog
        open={clearingMatch !== null}
        onOpenChange={(open) => !open && setClearingMatch(null)}
        match={clearingMatch}
        participantsById={participantsById}
        pending={pending}
        onConfirm={handleClearConfirm}
      />
    </div>
  );
}

export function GroupStandingsTable({
  participants,
  matches,
  swissPoints,
  tieBreakMetrics,
  advanceCount,
  swissRoundsCap,
}: {
  participants: TournamentParticipant[];
  matches: Match[];
  swissPoints: SwissPoints;
  tieBreakMetrics: [TieBreakMetric, TieBreakMetric, TieBreakMetric];
  // Both optional and only used together — when given, the top `advanceCount`
  // rows get a red "ADV" tag once the group's final Swiss round (round
  // `swissRoundsCap`) has been fully reported, matching the same top-N-per-
  // group rule the Final Stage bracket actually seeds from (qualifiedSlots in
  // lib/final-stage-placeholder.ts).
  advanceCount?: number;
  swissRoundsCap?: number;
}) {
  const rows = computeGroupStandings(participants, matches, swissPoints, tieBreakMetrics);
  const finalRoundMatches = swissRoundsCap != null ? matches.filter((m) => m.round === swissRoundsCap) : [];
  const finalRoundComplete = finalRoundMatches.length > 0 && finalRoundMatches.every((m) => m.status === "completed");
  const showAdvanceTags = finalRoundComplete && !!advanceCount && advanceCount > 0;

  if (rows.length === 0) {
    return (
      <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
        No participants in this group yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto border border-outline-variant/25">
      <table className="w-full min-w-[880px] text-left text-sm">
        <thead>
          <tr className="label-mono border-b border-outline-variant/25 text-on-surface/40">
            <th className="p-3" scope="col">Rank</th>
            <th className="p-3" scope="col">Participant</th>
            <th className="p-3" scope="col">W-L-T</th>
            <th className="p-3" scope="col">Score</th>
            <th className="p-3" scope="col">{tieBreakLabel(tieBreakMetrics[0])}</th>
            <th className="p-3" scope="col">{tieBreakLabel(tieBreakMetrics[1])}</th>
            <th className="p-3" scope="col">{tieBreakLabel(tieBreakMetrics[2])}</th>
            <th className="p-3" scope="col">TB</th>
            <th className="p-3" scope="col">Match History</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.participantId} className="border-b border-outline-variant/15 last:border-0 hover:bg-white/[0.02]">
              <td className="px-3 py-2 text-sm text-on-surface/60">{i + 1}</td>
              <td className="px-3 py-2 text-sm text-on-surface">
                {showAdvanceTags && i < advanceCount! ? (
                  <span className="label-mono mr-2 inline-block bg-error px-1.5 py-0.5 text-[10px] text-on-error">ADV</span>
                ) : null}
                {r.teamName ?? r.name}
              </td>
              <td className="px-3 py-2 text-sm text-on-surface/60">
                {r.wins}-{r.losses}-{r.ties}
              </td>
              <td className="px-3 py-2 text-sm font-mono text-on-surface">{formatMetric(r.score)}</td>
              <td className="px-3 py-2 text-sm text-on-surface/60">{formatMetric(r.tieBreak1, tieBreakMetrics[0])}</td>
              <td className="px-3 py-2 text-sm text-on-surface/60">{formatMetric(r.tieBreak2, tieBreakMetrics[1])}</td>
              <td className="px-3 py-2 text-sm text-on-surface/60">{formatMetric(r.tieBreak3, tieBreakMetrics[2])}</td>
              <td className="px-3 py-2 text-sm text-on-surface/60">{r.winsVsTied}</td>
              <td className="px-3 py-2 text-sm">
                <div className="flex gap-1">
                  {r.matchHistory.map((m, idx) => (
                    <span
                      key={idx}
                      title={`Round ${m.round}`}
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center text-[10px] font-bold",
                        m.result === "W" && "bg-emerald-600/80 text-white",
                        m.result === "L" && "bg-error text-on-error",
                        m.result === "T" && "bg-surface-container-high text-on-surface/60",
                        m.result === "BYE" && "border border-outline-variant/40 text-on-surface/40"
                      )}
                    >
                      {m.result === "BYE" ? "B" : m.result}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// `canSwapParticipants` gates the Matches tab's drag-and-drop re-pairing
// (see MatchParticipantSlot) to admin/super_admin only — an organizer
// running their own tournament can still Start/Report/Clear/Generate, just
// not drag one player's name onto another match to swap them.
export function GroupStageWorkspace({ tournamentId, slug, groups, participants, matches: initialMatches, swissPoints, tieBreakMetrics, swissRoundsCap, advancePerGroup, locked = false, canSwapParticipants = false }: { tournamentId: string; slug: string; groups: TournamentGroup[]; participants: TournamentParticipant[]; matches: Match[]; swissPoints: SwissPoints; tieBreakMetrics: [TieBreakMetric, TieBreakMetric, TieBreakMetric]; swissRoundsCap: number; advancePerGroup: number; locked?: boolean; canSwapParticipants?: boolean }) {
  const [activeGroupId, setActiveGroupId] = useState(groups[0]?.id ?? "");
  const [activeTab, setActiveTab] = useState<"standings" | "matches">("matches");
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onFullscreenChange() {
      setFullscreen(document.fullscreenElement === containerRef.current);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  }

  function exportCsv() {
    const activeGroup = groups.find((g) => g.id === activeGroupId);
    const groupParticipants = participants.filter((p) => p.group_id === activeGroupId).sort((a, b) => a.seed - b.seed);
    const rows = computeGroupStandings(groupParticipants, matches, swissPoints, tieBreakMetrics);
    const header = [
      "Rank",
      "Participant",
      "Wins",
      "Losses",
      "Ties",
      "Score",
      tieBreakLabel(tieBreakMetrics[0]),
      tieBreakLabel(tieBreakMetrics[1]),
      tieBreakLabel(tieBreakMetrics[2]),
      "TB",
    ];
    const csvRows = rows.map((r, i) => [
      i + 1,
      r.teamName ?? r.name,
      r.wins,
      r.losses,
      r.ties,
      r.score,
      r.tieBreak1,
      r.tieBreak2,
      r.tieBreak3,
      r.winsVsTied,
    ]);
    downloadCsv(`group-${activeGroup?.label ?? ""}-standings.csv`, [header, ...csvRows]);
  }

  if (groups.length === 0) return null;
  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? groups[0];
  const groupParticipants = participants.filter((p) => p.group_id === activeGroup.id).sort((a, b) => a.seed - b.seed);
  const groupMatches = matches.filter((m) => m.group_id === activeGroup.id);

  function setGroupMatches(updater: (prev: Match[]) => Match[]) {
    setMatches((prev) => {
      const group = prev.filter((m) => m.group_id === activeGroup.id);
      const rest = prev.filter((m) => m.group_id !== activeGroup.id);
      return [...rest, ...updater(group)];
    });
  }

  return (
    <div ref={containerRef} className={cn(fullscreen && "overflow-auto bg-background p-6")}>
      <div className="mt-4 mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/25 pb-3">
        <div className="flex flex-wrap items-center gap-1">
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setActiveGroupId(g.id)}
              className={cn(
                "label-mono px-3 py-1.5 text-xs transition-colors",
                g.id === activeGroup.id ? "bg-primary text-on-primary" : "text-on-surface/50 hover:text-on-surface"
              )}
            >
              Group {g.label}
            </button>
          ))}
          <span className="mx-2 h-5 w-px shrink-0 bg-outline-variant/30" aria-hidden="true" />
          {(["standings", "matches"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "label-mono px-3 py-1.5 text-xs capitalize transition-colors",
                tab === activeTab
                  ? "border-b-2 border-primary text-primary"
                  : "text-on-surface/50 hover:text-on-surface"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" aria-label="Export standings to CSV" onClick={exportCsv}>
            <Download className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            onClick={toggleFullscreen}
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {activeTab === "standings" ? (
        <GroupStandingsTable
          participants={groupParticipants}
          matches={groupMatches}
          swissPoints={swissPoints}
          tieBreakMetrics={tieBreakMetrics}
          advanceCount={advancePerGroup}
          swissRoundsCap={swissRoundsCap}
        />
      ) : (
        <MatchesTab
          groupId={activeGroup.id}
          tournamentId={tournamentId}
          slug={slug}
          participants={groupParticipants}
          matches={groupMatches}
          setMatches={setGroupMatches}
          swissRoundsCap={swissRoundsCap}
          locked={locked}
          canSwap={canSwapParticipants}
        />
      )}
    </div>
  );
}
