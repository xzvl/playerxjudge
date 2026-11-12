"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { UserRound, RefreshCw, Trash2, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { JudgePlayerPicker, type JudgePlayerOption } from "@/components/tournaments/judge/JudgePlayerPicker";
import {
  PlayerScorePanel,
  comboForNextBattle,
  emptyPlayerScoreState,
  committedPenalties,
  ownScore,
  type BoxEvent,
  type PlayerScoreState,
} from "@/components/tournaments/judge/PlayerScorePanel";
import { ConfirmResultDialog } from "@/components/tournaments/judge/ConfirmResultDialog";
import { JudgeViewResultDialog } from "@/components/tournaments/judge/JudgeViewResultDialog";
import { JudgeStadiumPromptDialog } from "@/components/tournaments/judge/JudgeStadiumPromptDialog";
import {
  attachMatchScreenshot,
  startMatch,
  stopMatch,
  submitJudgedMatchResult,
  updateMatchScoreProgress,
} from "@/app/account/organizer/tournament/[slug]/matches-actions";
import { assignStationMatch } from "@/app/account/organizer/tournament/[slug]/workspace-panels-actions";
import {
  getParticipantComboSlots,
  notifySeatedParticipants,
  setOwnStation,
  uploadMatchScreenshot,
} from "@/app/tournaments/[slug]/judge/actions";
import { captureElementAsWebp } from "@/lib/images/screenshot";
import { useRealtimeMatches } from "@/lib/hooks/use-realtime-matches";
import { useRealtimeRows } from "@/lib/hooks/use-realtime-rows";
import { cn } from "@/lib/utils";
import type { FinishType, Match, MatchBattle, MatchBattleCombo, TournamentStation } from "@/lib/types/database";

export interface JudgeMatchContext {
  matchId: string;
  round: number;
  matchNumber: number;
  stage: string;
  participantAId: string;
  participantBId: string;
}

type Side = "left" | "right";

interface PersistedSide {
  events: BoxEvent[];
  penaltyProgress: 0 | 1;
}

interface PersistedJudgeState {
  matchId: string;
  player1: PersistedSide;
  player2: PersistedSide;
}

function judgeConsoleStorageKey(tournamentId: string) {
  return `judge-console:${tournamentId}`;
}

// The per-battle tally (finish steppers, penalties, the box grid) lives
// only in this console's own React state until Submit Result — an
// involuntary reload (a phone's browser reclaiming a backgrounded tab, a
// flaky connection, a dev Fast Refresh) used to wipe it out completely,
// even though the match/players themselves reload fine from the server
// (see initialMatch in page.tsx). Mirrored into localStorage on every
// change below and read back in here at mount, keyed per tournament since
// a judge only ever works one match at a time on one device.
function loadPersistedJudgeState(tournamentId: string): PersistedJudgeState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(judgeConsoleStorageKey(tournamentId));
    return raw ? (JSON.parse(raw) as PersistedJudgeState) : null;
  } catch {
    return null;
  }
}

const NAV_ITEMS = [
  { id: "switch", label: "Switch", sub: "Swap players side", icon: RefreshCw },
  { id: "clear", label: "Clear", sub: "Clear players and scores", icon: Trash2 },
] as const;

export function JudgeConsole({
  slug,
  tournamentId,
  tournamentTitle,
  initialStations,
  initialStationId,
  judgeName,
  judgeUsername,
  participants,
  initialMatches,
  groups,
  initialMatch,
}: {
  slug: string;
  tournamentId: string;
  tournamentTitle: string;
  initialStations: TournamentStation[];
  initialStationId: string | null;
  judgeName: string;
  judgeUsername: string;
  // The tournament's full participant roster, not pre-filtered to whoever
  // has an active match right now — which participants are actually
  // pickable is derived live below (see pickableParticipantIds) so it stays
  // correct as matches complete and new rounds get generated, instead of
  // freezing at whatever was true the moment this page happened to load.
  participants: JudgePlayerOption[];
  initialMatches: Match[];
  groups: { id: string; label: string }[];
  initialMatch: JudgeMatchContext | null;
}) {
  const groupLabelById = useMemo(() => new Map(groups.map((g) => [g.id, g.label])), [groups]);

  // Kept live the same way every other tournament workspace already does
  // (GroupStageWorkspace, SpectatorBoard) — a judge's console used to be
  // handed a one-time snapshot at page load and never hear about anything
  // that happened afterward: a new round generated, another judge finishing
  // their match, a station being freed. That staleness is what made picking
  // a player in a just-generated round silently fail (their match wasn't in
  // this snapshot yet) and let two judges both load the same "ongoing"
  // match. `matches` here is the tournament's non-completed matches plus
  // whatever transitions to/from "completed" while this console stays open;
  // `stations` is every station, kept in sync the same way the organizer's
  // own Stations page and the Spectator Board are.
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  useRealtimeMatches(tournamentId, setMatches);
  const [stations, setStations] = useState<TournamentStation[]>(initialStations);
  useRealtimeRows<TournamentStation>("tournament_stations", tournamentId, setStations);

  // Read once at mount (the setter is never used) — only relevant if it's
  // for the *same* match the server just handed back as initialMatch;
  // otherwise it's leftover from a previous match this device was scoring
  // and gets ignored (the persistence effect below overwrites/clears it the
  // moment a real match loads here).
  const [persisted] = useState(() => loadPersistedJudgeState(tournamentId));
  const persistedForThisMatch = persisted && persisted.matchId === initialMatch?.matchId ? persisted : null;

  const [player1, setPlayer1] = useState<PlayerScoreState>(() => ({
    ...emptyPlayerScoreState(),
    participantId: initialMatch?.participantAId ?? null,
    ...(persistedForThisMatch ? persistedForThisMatch.player1 : {}),
  }));
  const [player2, setPlayer2] = useState<PlayerScoreState>(() => ({
    ...emptyPlayerScoreState(),
    participantId: initialMatch?.participantBId ?? null,
    ...(persistedForThisMatch ? persistedForThisMatch.player2 : {}),
  }));
  const [matchContext, setMatchContext] = useState<JudgeMatchContext | null>(initialMatch);

  // A match still "ongoing" somewhere else shouldn't show its players in
  // either picker — they're already seated at another station — but this
  // console's own currently-loaded match (if it's the ongoing one) stays
  // visible since it's already selected. Anything "scheduled" (not yet
  // picked up by anyone) is always fair game.
  const pickableParticipantIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of matches) {
      if (m.status === "completed") continue;
      if (m.status === "ongoing" && m.id !== matchContext?.matchId) continue;
      if (m.participant_a_id) ids.add(m.participant_a_id);
      if (m.participant_b_id) ids.add(m.participant_b_id);
    }
    return ids;
  }, [matches, matchContext?.matchId]);
  // Always keeps whoever's actually loaded on either side right now in the
  // list too, even if they wouldn't otherwise qualify — so a picker never
  // appears to "lose" its own current selection.
  const pickableParticipants = useMemo(() => {
    const extra = new Set([player1.participantId, player2.participantId].filter((id): id is string => !!id));
    return participants.filter((p) => pickableParticipantIds.has(p.id) || extra.has(p.id));
  }, [participants, pickableParticipantIds, player1.participantId, player2.participantId]);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [viewResultOpen, setViewResultOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [stationId, setStationId] = useState<string | null>(initialStationId);
  // Nudges whoever opened the console to claim a stadium before scoring —
  // only once, and only when there's actually a choice to make; picking one
  // (from here or the header field below) dismisses it for the rest of the
  // session.
  const [stadiumPromptOpen, setStadiumPromptOpen] = useState(() => stations.length > 0 && !initialStationId);
  // Resumes from the highest `seq` already restored above rather than
  // always starting back at 0 — a fresh box scored after a reload has to
  // sort *after* whatever was recovered, or the merged battle log at
  // submit time would reorder itself around the restored events.
  const seqRef = useRef(
    persistedForThisMatch
      ? Math.max(0, ...[...persistedForThisMatch.player1.events, ...persistedForThisMatch.player2.events].map((e) => e.seq))
      : 0
  );
  // The console's own root — every dialog here (Confirm Result, View
  // Result, the stadium popup) is a Radix Dialog, which portals its content
  // to `document.body` rather than rendering inside this tree. Capturing
  // this ref instead of document.body is what keeps those popups out of
  // the Submit Result screenshot.
  const consoleRef = useRef<HTMLDivElement>(null);

  function nextSeq() {
    seqRef.current += 1;
    return seqRef.current;
  }

  function stateSetter(side: Side) {
    return side === "left" ? setPlayer1 : setPlayer2;
  }

  // Fires the moment a match is actually picked to work on (by player, by
  // stadium — see selectPlayer/applyStationMatch below): starts it
  // (scheduled -> ongoing, same transition the organizer's own Start button
  // makes) and, if the judge has a stadium claimed, assigns it there too —
  // so the organizer's Stations page and the player view's own live
  // "Station" status pick it up without anyone touching the Stations page
  // by hand. Also notifies each side's linked account, if any, that
  // they've been picked up (see notifySeatedParticipants) — both
  // participants are known any time this is called, since it only runs
  // once a full match (not just one side) is set. Fire-and-forget, same as
  // setOwnStation below: nothing here blocks the console's own UI on the
  // round trip.
  function startMatchAtStation(matchId: string, forStationId: string | null, aId: string, bId: string) {
    void startMatch(matchId, slug);
    if (forStationId) void assignStationMatch(forStationId, slug, matchId);
    const stationName = forStationId ? stations.find((s) => s.id === forStationId)?.name ?? null : null;
    void notifySeatedParticipants(tournamentId, slug, tournamentTitle, aId, bId, stationName, judgeName);
  }

  // Reverts a match this console picked up but never actually finished
  // scoring — stepping away from it (Clear, or picking a different player
  // because the wrong one got selected by mistake) back to "scheduled" and
  // frees whichever station had it, instead of leaving it stuck "ongoing"
  // forever and permanently unpickable by anyone (see pickableParticipantIds
  // above). Never call this for a match that just finished submitting —
  // handleBothConfirmed already frees the station itself and the match is
  // rightfully "completed" by then, not abandoned.
  function abandonMatch(matchId: string, forStationId: string | null) {
    void stopMatch(matchId, slug);
    if (forStationId) void assignStationMatch(forStationId, slug, null);
  }

  // Fetches both sides' linked-account combo slots (see
  // getParticipantComboSlots) and folds them into whichever state
  // currently holds that participantId — a plain fetch rather than
  // blocking picking a player on it, since it's purely informational (the
  // "Using: ..." label, and incrementFinish's per-battle snapshot below)
  // until Submit Result actually reads it. Matched by participantId (not
  // "player1"/"player2" directly) so it still lands correctly even if
  // Switch fires while this is in flight.
  function refreshComboSlots(aId: string, bId: string) {
    void (async () => {
      const [aSlots, bSlots] = await Promise.all([getParticipantComboSlots(tournamentId, aId), getParticipantComboSlots(tournamentId, bId)]);
      const applyTo = (prev: PlayerScoreState) =>
        prev.participantId === aId ? { ...prev, comboSlots: aSlots } : prev.participantId === bId ? { ...prev, comboSlots: bSlots } : prev;
      setPlayer1(applyTo);
      setPlayer2(applyTo);
    })();
  }

  // Keeps comboSlots from ever going stale for the rest of an active
  // match — fires once immediately whenever the match changes (covering
  // every way one gets picked, including `initialMatch`, set server-side
  // when the judge/organizer's claimed station already has a match
  // running — see page.tsx), then again every 10s for as long as it stays
  // the current match, so a player rearranging their deck mid-match is
  // reflected in time for whichever battle gets scored next (see
  // incrementFinish) rather than only affecting the *next* match.
  useEffect(() => {
    if (!matchContext) return;
    refreshComboSlots(matchContext.participantAId, matchContext.participantBId);
    const intervalId = setInterval(() => refreshComboSlots(matchContext.participantAId, matchContext.participantBId), 10_000);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchContext?.matchId]);

  // Mirrors the live box tally into localStorage on every change (see
  // loadPersistedJudgeState above) so an involuntary reload can recover it.
  // Clears the slot the moment there's no active match, so a stale tally
  // never bleeds into whatever gets picked next.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = judgeConsoleStorageKey(tournamentId);
    if (!matchContext) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Ignored — recovery is best-effort.
      }
      return;
    }
    try {
      const toPersist: PersistedJudgeState = {
        matchId: matchContext.matchId,
        player1: { events: player1.events, penaltyProgress: player1.penaltyProgress },
        player2: { events: player2.events, penaltyProgress: player2.penaltyProgress },
      };
      window.localStorage.setItem(key, JSON.stringify(toPersist));
    } catch {
      // Ignored — recovery is best-effort.
    }
  }, [tournamentId, matchContext, player1.events, player1.penaltyProgress, player2.events, player2.penaltyProgress]);

  // A second line of defense against the same loss: warns before a manual
  // reload/tab-close/navigation while there's actually unsaved scoring
  // progress, rather than letting it happen silently. Doesn't (can't) catch
  // every way a browser can reload itself — a backgrounded mobile tab being
  // discarded for memory happens with no event to hook — which is what the
  // recovery above is for.
  useEffect(() => {
    if (!matchContext) return;
    if (player1.events.length === 0 && player2.events.length === 0) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [matchContext, player1.events.length, player2.events.length]);

  // Picking a participant on either side looks up their one active
  // (non-completed) match and fills the *other* side with the real
  // opponent, plus the round/stage that match is actually part of. If this
  // console already had a *different* match loaded and not yet submitted —
  // the judge picked the wrong player and is now correcting it — that old
  // one is abandoned first (see abandonMatch) rather than left stuck
  // "ongoing" at this station.
  function selectPlayer(side: Side, participantId: string) {
    // A participant can have more than one match in `matches` once a new
    // round's been generated (their just-finished previous-round match is
    // still in state, now "completed" — see the realtime subscription
    // above) — completed ones don't count as "their one active match" here,
    // same as the server-side query this list started from used to filter.
    const match = matches.find(
      (m) => m.status !== "completed" && (m.participant_a_id === participantId || m.participant_b_id === participantId)
    );
    const picked: PlayerScoreState = { participantId, events: [], penaltyProgress: 0, comboSlots: null };

    if (matchContext && matchContext.matchId !== match?.id) {
      abandonMatch(matchContext.matchId, stationId);
    }

    if (!match || !match.participant_a_id || !match.participant_b_id) {
      stateSetter(side)(picked);
      stateSetter(side === "left" ? "right" : "left")(emptyPlayerScoreState());
      setMatchContext(null);
      return;
    }

    const opponentId = match.participant_a_id === participantId ? match.participant_b_id : match.participant_a_id;
    const opponent: PlayerScoreState = { participantId: opponentId, events: [], penaltyProgress: 0, comboSlots: null };
    stateSetter(side)(picked);
    stateSetter(side === "left" ? "right" : "left")(opponent);
    setMatchContext({
      matchId: match.id,
      round: match.round,
      matchNumber: match.match_number,
      stage: match.group_id ? `Group ${groupLabelById.get(match.group_id) ?? "?"}` : "Final Stage",
      participantAId: match.participant_a_id,
      participantBId: match.participant_b_id,
    });
    startMatchAtStation(match.id, stationId, match.participant_a_id, match.participant_b_id);
  }

  // Fills both sides from whatever match a stadium is currently running —
  // same shape of fill as the initial server-side load (see
  // app/tournaments/[slug]/judge/page.tsx), just re-runnable every time the
  // Stadium field changes instead of only once at mount. `forStationId` is
  // the stadium being switched *to* — passed explicitly rather than read
  // off the `stationId` state, since the caller's own setStationId hasn't
  // committed yet when this runs. Same wrong-player correction as
  // selectPlayer: switching away from an unsubmitted match abandons it
  // first instead of leaving it orphaned.
  function applyStationMatch(currentMatchId: string | null, forStationId: string | null) {
    if (matchContext && matchContext.matchId !== currentMatchId) {
      abandonMatch(matchContext.matchId, stationId);
      setPlayer1(emptyPlayerScoreState());
      setPlayer2(emptyPlayerScoreState());
      setMatchContext(null);
    }
    if (!currentMatchId) return;
    const stationMatch = matches.find((m) => m.id === currentMatchId);
    if (!stationMatch?.participant_a_id || !stationMatch?.participant_b_id) return;
    setPlayer1({ participantId: stationMatch.participant_a_id, events: [], penaltyProgress: 0, comboSlots: null });
    setPlayer2({ participantId: stationMatch.participant_b_id, events: [], penaltyProgress: 0, comboSlots: null });
    setMatchContext({
      matchId: stationMatch.id,
      round: stationMatch.round,
      matchNumber: stationMatch.match_number,
      stage: stationMatch.group_id ? `Group ${groupLabelById.get(stationMatch.group_id) ?? "?"}` : "Final Stage",
      participantAId: stationMatch.participant_a_id,
      participantBId: stationMatch.participant_b_id,
    });
    startMatchAtStation(stationMatch.id, forStationId, stationMatch.participant_a_id, stationMatch.participant_b_id);
  }

  // Claims a stadium as the current session's own (persisted server-side —
  // see setOwnStation) and, if that stadium already has a match running,
  // loads it the same way picking a player does.
  function handleStationChange(newStationId: string) {
    const resolved = newStationId || null;
    setStationId(resolved);
    setStadiumPromptOpen(false);
    void setOwnStation(slug, resolved);
    if (resolved) {
      const station = stations.find((s) => s.id === resolved);
      if (station) applyStationMatch(station.current_match_id, resolved);
    } else if (matchContext) {
      abandonMatch(matchContext.matchId, stationId);
      setPlayer1(emptyPlayerScoreState());
      setPlayer2(emptyPlayerScoreState());
      setMatchContext(null);
    }
  }

  // Resolves and freezes both sides' combo for this specific battle right
  // now, from whatever comboSlots each side currently holds (kept fresh by
  // the effect above) — not deferred to submit time, so a deck
  // rearrangement made *after* this battle is scored can never rewrite
  // what it recorded. The slot is the running total across both sides
  // (this battle is the (battleCount + 1)th of the match), matching
  // comboForNextBattle's rule for the live "Using: ..." preview.
  function comboRef(combo: { id: string; name: string } | null | undefined): MatchBattleCombo | null {
    return combo ? { id: combo.id, name: combo.name } : null;
  }

  function incrementFinish(side: Side, kind: FinishType) {
    const own = side === "left" ? player1 : player2;
    const opponent = side === "left" ? player2 : player1;
    const battleCount = own.events.filter((e) => e.kind !== "penalty").length + opponent.events.filter((e) => e.kind !== "penalty").length;
    const slot = battleCount % 3;
    const ownerCombo = comboRef(own.comboSlots?.[slot]);
    const opponentCombo = comboRef(opponent.comboSlots?.[slot]);
    stateSetter(side)((prev) => ({ ...prev, events: [...prev.events, { kind, seq: nextSeq(), ownerCombo, opponentCombo }] }));
  }

  function decrementFinish(side: Side, kind: FinishType) {
    stateSetter(side)((prev) => {
      const idx = prev.events.map((e) => e.kind).lastIndexOf(kind);
      if (idx === -1) return prev;
      return { ...prev, events: [...prev.events.slice(0, idx), ...prev.events.slice(idx + 1)] };
    });
  }

  function penaltyPlus(side: Side) {
    stateSetter(side)((prev) =>
      prev.penaltyProgress === 0
        ? { ...prev, penaltyProgress: 1 }
        : { ...prev, penaltyProgress: 0, events: [...prev.events, { kind: "penalty", seq: nextSeq() }] }
    );
  }

  function penaltyMinus(side: Side) {
    stateSetter(side)((prev) => {
      if (prev.penaltyProgress === 1) return { ...prev, penaltyProgress: 0 };
      const idx = prev.events.map((e) => e.kind).lastIndexOf("penalty");
      if (idx === -1) return prev;
      return { ...prev, penaltyProgress: 1, events: [...prev.events.slice(0, idx), ...prev.events.slice(idx + 1)] };
    });
  }

  function handleSwitch() {
    setPlayer1(player2);
    setPlayer2(player1);
  }

  // The explicit Clear action (nav item + mobile bar) — also abandons
  // whatever match was loaded (see abandonMatch) so a mis-pick cleared out
  // this way doesn't stay stuck "ongoing" either. resetLocalState below is
  // the shared bit that doesn't touch the server, reused by the post-submit
  // path in handleBothConfirmed where the match is rightfully completed,
  // not abandoned.
  function handleClear() {
    if (matchContext) abandonMatch(matchContext.matchId, stationId);
    resetLocalState();
  }

  function resetLocalState() {
    setPlayer1(emptyPlayerScoreState());
    setPlayer2(emptyPlayerScoreState());
    setMatchContext(null);
    setSaveError(null);
  }

  async function handleBothConfirmed() {
    if (!matchContext) return;
    setSaving(true);
    setSaveError(null);

    const aState = player1.participantId === matchContext.participantAId ? player1 : player2;
    const bState = aState === player1 ? player2 : player1;
    const aName = aState === player1 ? name1 : name2;
    const bName = aState === player1 ? name2 : name1;

    // Each event already carries both sides' combo, resolved and frozen
    // the moment it was scored (see incrementFinish) — no recomputation
    // from comboSlots needed here, and nothing here can retroactively
    // change what an already-scored battle recorded even if the deck's
    // been rearranged since. `ownerCombo`/`opponentCombo` are relative to
    // whichever side actually recorded (won) the event, so they're
    // remapped to participantA/participantB here based on which state
    // each event came from.
    const merged: (BoxEvent & { winnerId: string; aCombo: MatchBattleCombo | null; bCombo: MatchBattleCombo | null })[] = [
      ...aState.events.map((e) => ({ ...e, winnerId: aState.participantId!, aCombo: e.ownerCombo ?? null, bCombo: e.opponentCombo ?? null })),
      ...bState.events.map((e) => ({ ...e, winnerId: bState.participantId!, aCombo: e.opponentCombo ?? null, bCombo: e.ownerCombo ?? null })),
    ].sort((x, y) => x.seq - y.seq);
    const battles: MatchBattle[] = merged
      .filter((e) => e.kind !== "penalty")
      .map((e) => ({
        winnerId: e.winnerId,
        finishType: e.kind as FinishType,
        participantACombo: e.aCombo,
        participantBCombo: e.bCombo,
      }));

    const matchId = matchContext.matchId;
    const submittingStationId = stationId;

    // Proof-of-result screenshot of the console itself (both scorecards,
    // header, everything in consoleRef) — deliberately not document.body,
    // since that would also pick up the Confirm Result dialog's portal
    // (see consoleRef's comment above). Kicked off here but *not* awaited
    // before the actual score write below: html2canvas rendering a whole
    // console and uploading the result is by far the slowest part of
    // judging a match, and both players used to sit waiting on that before
    // their score even reached the database. It races the write instead —
    // whichever finishes first, the other just keeps going — and gets
    // attached to the match afterward (see the background block below).
    // Best-effort throughout: a capture or upload failure never blocks or
    // undoes the result itself.
    const screenshotPromise = captureElementAsWebp(consoleRef.current ?? document.body).catch(() => null);

    const result = await submitJudgedMatchResult(matchId, slug, {
      scoreA: ownScore(aState) + committedPenalties(bState),
      scoreB: ownScore(bState) + committedPenalties(aState),
      battles,
      penaltiesA: committedPenalties(aState),
      penaltiesB: committedPenalties(bState),
      judgeName,
      judgeUsername,
      participantAName: aName,
      participantBName: bName,
      station: submittingStationId ? (stations.find((s) => s.id === submittingStationId)?.name ?? undefined) : undefined,
    });

    setSaving(false);
    if (result.status === "error") {
      setSaveError(result.message ?? "Something went wrong.");
      return;
    }
    // The match is done — free up the stadium it was running at for
    // whichever match gets picked next, same "clear" assignStationMatch(...,
    // null) already gives the organizer's own Stations page.
    if (submittingStationId) void assignStationMatch(submittingStationId, slug, null);
    setConfirmOpen(false);

    // Finish the screenshot in the background — the console only actually
    // clears (resetLocalState, not the abandon-match handleClear: the match
    // is rightfully completed, not abandoned) once the *capture* itself
    // settles, never the upload, so html2canvas can't race resetLocalState's
    // own DOM mutation mid-render and end up with a torn/blank screenshot.
    void (async () => {
      const blob = await screenshotPromise;
      resetLocalState();
      if (!blob) return;
      try {
        const webpFile = new File([blob], "match-screenshot.webp", { type: "image/webp" });
        const formData = new FormData();
        formData.set("file", webpFile);
        const uploadResult = await uploadMatchScreenshot(tournamentId, matchId, formData);
        if (uploadResult.status === "success" && uploadResult.url) {
          await attachMatchScreenshot(matchId, slug, uploadResult.url);
        }
      } catch {
        // Ignored — see comment above.
      }
    })();
  }

  const score1 = ownScore(player1) + committedPenalties(player2);
  const score2 = ownScore(player2) + committedPenalties(player1);

  // Keeps the match row's own `score` in sync with the live tally while
  // it's being scored — not just at Submit Result — so the Spectator
  // Board's "Playing Now" cards (which just read `matches` off the same
  // realtime subscription every other live view already uses) can show a
  // running score instead of only a final one. Harmless if it fires after
  // the match has already been submitted/cleared: updateMatchScoreProgress
  // only ever writes to a still-"ongoing" row, so a stray call for a
  // match that just got marked "completed" is a no-op.
  //
  // score1/score2 are the *left/right* panels, not participant A/B — Switch
  // swaps which participant sits in which panel without touching
  // matchContext's own participantAId/participantBId, so score1 doesn't
  // reliably mean "A's score" once a match's been switched. Remapped here
  // by participantId, same as handleBothConfirmed's aState/bState do at
  // submit time, so `score.a` in the DB always lines up with
  // participant_a_id regardless of which side it's currently displayed on.
  //
  // Debounced (last change in a ~500ms burst wins) rather than firing on
  // every single tap: each call is its own authenticated server round trip
  // (middleware validates the session, then this action validates it again
  // — both are real network hits to Supabase Auth, not just a local check),
  // and box-scoring taps during a fast battle can come in well under a
  // second apart. Undebounced, a burst of taps used to queue up a pile of
  // these still in flight, competing with — and visibly delaying — both
  // later taps' own sync and the Submit Result call fired right after
  // scoring stopped. The live score staying half a second behind is
  // unnoticeable on a spectator screen; a judge unable to tell if a tap or
  // Submit actually registered is not.
  const scoreSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!matchContext) return;
    const player1IsA = player1.participantId === matchContext.participantAId;
    const scoreA = player1IsA ? score1 : score2;
    const scoreB = player1IsA ? score2 : score1;
    const matchId = matchContext.matchId;

    if (scoreSyncTimeoutRef.current) clearTimeout(scoreSyncTimeoutRef.current);
    scoreSyncTimeoutRef.current = setTimeout(() => {
      scoreSyncTimeoutRef.current = null;
      void updateMatchScoreProgress(matchId, scoreA, scoreB);
    }, 500);

    return () => {
      if (scoreSyncTimeoutRef.current) clearTimeout(scoreSyncTimeoutRef.current);
    };
  }, [matchContext, player1.participantId, score1, score2]);

  const name1 = participants.find((p) => p.id === player1.participantId)?.displayName ?? "Player 1";
  const name2 = participants.find((p) => p.id === player2.participantId)?.displayName ?? "Player 2";
  const combo1 = comboForNextBattle(player1, player2);
  const combo2 = comboForNextBattle(player2, player1);

  return (
    <div ref={consoleRef} className="app-shell flex min-h-screen bg-background text-on-surface">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-outline-variant/20 bg-surface-container-lowest lg:flex">
        <div className="border-b border-outline-variant/20 px-4 pb-4 pt-5">
          <Link href="/" className="heading block text-lg" aria-label="PlayerXJudge home">
            <BrandLogo width={136} height={15} />
          </Link>
          <div className="mt-4 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
            <p className="text-[13px] font-medium text-on-surface/80">Judge Console</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <p className="mb-1 px-2 text-xs font-medium text-on-surface/40">Actions</p>
          {NAV_ITEMS.map(({ id, label, sub, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={id === "switch" ? handleSwitch : handleClear}
              className="group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-surface-container text-left"
            >
              <Icon className="h-4 w-4 shrink-0 text-on-surface/40 transition-colors group-hover:text-on-surface" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-on-surface/85 group-hover:text-on-surface">{label}</span>
                <span className="block truncate text-[11px] text-on-surface/40">{sub}</span>
              </span>
            </button>
          ))}
          <Link
            href={`/tournaments/${slug}/player`}
            className="group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-surface-container"
          >
            <UserRound className="h-4 w-4 shrink-0 text-on-surface/40 transition-colors group-hover:text-on-surface" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-on-surface/85 group-hover:text-on-surface">Player</span>
              <span className="block truncate text-[11px] text-on-surface/40">Player Dashboard</span>
            </span>
          </Link>
          <Link
            href={`/tournaments/${slug}`}
            className="group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-surface-container"
          >
            <Trophy className="h-4 w-4 shrink-0 text-on-surface/40 transition-colors group-hover:text-on-surface" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-on-surface/85 group-hover:text-on-surface">Tournament</span>
              <span className="block truncate text-[11px] text-on-surface/40">Tournament Details</span>
            </span>
          </Link>
        </nav>
      </aside>

      <div className="mx-auto min-w-0 max-w-[1440px] flex-1">
        <header className="relative border-b border-outline-variant/25 px-4 py-5 md:px-8 max-lg:landscape:rounded-lg max-lg:landscape:border-b-0 max-lg:landscape:py-2 max-lg:portrait:border-b-0 max-lg:portrait:py-2">
          <ThemeToggle className="absolute top-0 right-0" />
          <div className="mb-4 flex items-center justify-center gap-4 max-lg:landscape:mb-0">
            <p className="label-mono text-center text-on-surface/40">{tournamentTitle}</p>
          </div>
          <div className="flex items-start justify-between gap-4 max-lg:landscape:grid max-lg:landscape:grid-cols-3 max-lg:landscape:items-center max-lg:landscape:gap-2">
            <div className="min-w-0 max-lg:landscape:w-full max-lg:portrait:w-full">
              <JudgePlayerPicker
                label="Player 1"
                sideLabel="[X Side]"
                options={pickableParticipants}
                selectedId={player1.participantId}
                onSelect={(id) => selectPlayer("left", id)}
              />
              {combo1 ? <p className="mt-1 truncate text-xs text-on-surface/50">Using: <span className="text-on-surface/80">{combo1.name}</span></p> : null}
            </div>
            <div className="shrink-0 pt-1 text-center max-lg:landscape:pt-0 max-lg:portrait:pt-0">
              <p className="label-mono text-primary">{matchContext ? `Round ${matchContext.round}` : "—"}</p>
              <p className="label-mono text-[10px] text-on-surface/40">{matchContext?.stage ?? "No match"}</p>
            </div>
            <div className="min-w-0 text-right max-lg:landscape:w-full max-lg:portrait:w-full">
              <JudgePlayerPicker
                label="Player 2"
                sideLabel="[B Side]"
                options={pickableParticipants}
                selectedId={player2.participantId}
                onSelect={(id) => selectPlayer("right", id)}
                align="right"
              />
              {combo2 ? <p className="mt-1 truncate text-xs text-on-surface/50">Using: <span className="text-on-surface/80">{combo2.name}</span></p> : null}
            </div>
          </div>
        </header>

        <div className="grid gap-4 lg:gap-6 px-4 lg:py-4 lg:py-8 pb-24 md:px-8 grid-cols-[1fr_1fr_1fr] lg:grid-cols-[1fr_auto_1fr] lg:pb-8">
          <PlayerScorePanel
            state={player1}
            bonusPenalties={committedPenalties(player2)}
            side="left"
            onIncrementFinish={(kind) => incrementFinish("left", kind)}
            onDecrementFinish={(kind) => decrementFinish("left", kind)}
            onPenaltyPlus={() => penaltyPlus("left")}
            onPenaltyMinus={() => penaltyMinus("left")}
          />

          <div className="flex flex-col items-center gap-4 lg:w-56">
            <div data-slot="card" className="w-full space-y-2 border border-outline-variant/25 bg-surface-container-low p-4">
              {stations.length > 0 ? (
                <Combobox
                  label="Stadium"
                  hideLabel
                  placeholder="Select a stadium"
                  value={stationId ?? ""}
                  onValueChange={handleStationChange}
                  options={stations.map((s) => ({ value: s.id, label: s.name }))}
                />
              ) : (
                <p className="text-center font-medium text-on-surface">No stadiums set up</p>
              )}
              <p className="label-mono text-center text-[10px] text-on-surface/40">{judgeName}</p>
            </div>

            <div className="label-mono flex w-full items-center justify-center gap-2 text-on-surface/40">
              <span>X Side</span>
              <span aria-hidden="true">|</span>
              <span>B Side</span>
            </div>

            <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-3">
              <p className={cn("text-center font-mono text-4xl font-bold", score1 > score2 ? "text-primary" : "text-on-surface")}>{score1}</p>
              <span className="text-on-surface/30">vs</span>
              <p className={cn("text-center font-mono text-4xl font-bold", score2 > score1 ? "text-primary" : "text-on-surface")}>{score2}</p>
            </div>

            <Button
              variant="outline"
              className="w-full"
              disabled={!matchContext}
              onClick={() => setViewResultOpen(true)}
              tooltip="Preview this battle's result so far"
            >
              View Result
            </Button>
            <Button className="w-full" disabled={!matchContext} onClick={() => setConfirmOpen(true)} tooltip="Submit this battle's result">
              Submit Result
            </Button>
          </div>

          <PlayerScorePanel
            state={player2}
            bonusPenalties={committedPenalties(player1)}
            side="right"
            onIncrementFinish={(kind) => incrementFinish("right", kind)}
            onDecrementFinish={(kind) => decrementFinish("right", kind)}
            onPenaltyPlus={() => penaltyPlus("right")}
            onPenaltyMinus={() => penaltyMinus("right")}
          />
        </div>
      </div>

      <nav
        aria-label="Judge console actions"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-outline-variant/25 bg-surface-container-lowest lg:hidden"
      >
        <button
          type="button"
          onClick={handleSwitch}
          className="flex flex-1 flex-col items-center gap-1 py-2 text-on-surface/60 transition-colors hover:text-on-surface"
        >
          <RefreshCw className="h-5 w-5" aria-hidden="true" />
          <span className="text-[10px] font-medium">Switch</span>
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="flex flex-1 flex-col items-center gap-1 py-2 text-on-surface/60 transition-colors hover:text-on-surface"
        >
          <Trash2 className="h-5 w-5" aria-hidden="true" />
          <span className="text-[10px] font-medium">Clear</span>
        </button>
        <Link href="/" className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-on-surface transition-colors hover:text-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 1024 1024">
          <g>
          <path d="M 185.75 653.17 C185.59,732.86 185.16,774.43 184.50,774.63 C183.95,774.79 181.02,772.64 178.00,769.84 C174.98,767.05 170.25,763.07 167.50,760.99 C164.75,758.92 160.95,755.60 159.05,753.61 C157.16,751.63 155.13,749.99 154.55,749.99 C153.97,749.98 151.48,748.04 149.00,745.68 C146.52,743.31 142.02,739.54 139.00,737.30 C135.98,735.06 131.95,731.60 130.05,729.61 C128.16,727.63 126.13,725.99 125.55,725.97 C124.97,725.96 122.19,723.82 119.37,721.22 C116.54,718.62 111.93,714.56 109.12,712.19 L 104.00 707.89 L 104.00 321.17 L 107.75 317.70 C114.28,311.66 125.99,301.58 129.20,299.25 C130.90,298.02 134.38,295.09 136.95,292.75 C139.51,290.41 146.05,284.90 151.49,280.50 C156.92,276.10 164.62,269.58 168.58,266.00 C175.10,260.12 188.45,248.73 202.32,237.20 C205.17,234.83 211.32,229.57 216.00,225.51 C220.68,221.44 229.00,214.27 234.50,209.56 C247.95,198.06 259.63,187.85 268.35,180.00 C278.96,170.44 294.90,157.00 295.62,157.00 C295.97,157.00 299.23,154.11 302.88,150.57 C306.52,147.04 310.85,143.12 312.50,141.87 C314.15,140.62 318.88,136.64 323.00,133.01 C327.12,129.39 331.45,125.77 332.62,124.96 C333.79,124.16 337.10,121.58 339.99,119.23 C344.13,115.86 345.53,115.20 346.62,116.10 C347.79,117.07 347.97,148.97 347.75,323.87 L 347.50 530.50 L 287.50 531.11 C254.50,531.44 218.16,531.78 206.75,531.86 L 186.01 532.00 ZM 699.13 900.34 C697.65,902.12 696.72,902.39 695.67,901.33 C695.30,900.97 695.00,827.90 695.00,738.96 C695.00,603.45 695.22,577.06 696.37,576.11 C697.35,575.30 708.87,575.05 737.10,575.24 L 776.47 575.50 L 777.18 579.50 C777.57,581.70 777.91,613.54 777.94,650.25 C777.98,695.02 778.34,717.00 779.02,717.00 C779.58,717.00 781.95,715.30 784.27,713.22 C786.60,711.14 790.75,707.68 793.50,705.53 C796.25,703.38 800.85,699.57 803.72,697.06 C817.04,685.41 828.69,675.10 833.33,670.86 L 838.40 666.22 L 838.24 512.86 C838.14,428.51 838.05,358.94 838.03,358.26 C838.02,357.57 836.10,355.64 833.77,353.95 C831.45,352.27 825.79,347.32 821.20,342.95 C816.61,338.58 812.53,335.00 812.13,335.00 C811.72,335.00 807.37,331.26 802.45,326.70 C797.53,322.13 792.45,317.67 791.16,316.79 C789.88,315.91 785.83,312.30 782.16,308.76 C778.50,305.23 774.75,301.92 773.84,301.42 C772.92,300.91 770.22,298.69 767.84,296.48 C765.45,294.26 761.03,290.44 758.01,287.98 C754.99,285.51 750.04,281.17 747.01,278.32 C743.98,275.47 739.70,271.80 737.50,270.16 C735.30,268.52 731.06,264.89 728.08,262.09 C725.10,259.29 722.40,256.99 722.08,256.98 C721.76,256.98 719.03,254.68 716.00,251.88 C712.97,249.08 708.25,245.09 705.50,243.02 C702.95,241.09 701.10,240.08 699.79,238.61 C696.41,234.82 696.46,227.97 696.71,194.69 C696.75,190.34 696.78,185.54 696.82,180.24 C697.09,136.53 697.40,126.13 698.43,126.74 C699.13,127.16 703.04,130.48 707.10,134.13 C718.40,144.26 728.63,153.14 733.29,156.86 C735.61,158.71 741.22,163.77 745.77,168.11 C750.33,172.45 754.38,176.01 754.77,176.03 C755.17,176.04 757.53,177.91 760.00,180.18 C762.47,182.45 767.42,186.67 771.00,189.55 C774.58,192.44 779.97,197.36 783.00,200.49 C786.03,203.62 789.22,206.48 790.10,206.84 C790.97,207.20 795.02,210.50 799.10,214.17 C810.70,224.61 825.07,237.15 830.00,241.14 C832.47,243.14 836.85,247.07 839.72,249.89 C842.59,252.70 845.21,255.00 845.53,255.00 C846.15,255.00 863.32,269.80 872.93,278.61 C875.99,281.43 879.03,283.90 879.68,284.11 C880.32,284.33 883.96,287.47 887.75,291.11 C891.55,294.74 895.15,297.89 895.77,298.11 C896.39,298.32 900.48,301.76 904.87,305.75 C909.26,309.74 913.25,313.00 913.74,313.00 C914.23,313.00 915.84,314.26 917.31,315.80 L 920.00 318.61 L 920.00 708.84 L 911.76 716.42 C907.23,720.59 903.10,724.00 902.59,724.00 C902.08,724.00 898.92,726.51 895.58,729.58 C892.24,732.64 885.22,738.77 880.00,743.18 C859.35,760.63 854.59,764.73 848.17,770.55 C844.50,773.87 839.70,777.92 837.50,779.54 C835.30,781.16 830.30,785.52 826.38,789.24 C822.47,792.96 818.96,796.00 818.59,796.00 C818.22,796.00 814.20,799.58 809.66,803.96 C805.12,808.34 799.63,813.22 797.46,814.81 C795.28,816.40 786.08,824.31 777.00,832.38 C767.92,840.45 760.05,847.39 759.50,847.79 C758.32,848.65 746.58,859.01 732.91,871.25 C727.54,876.06 722.94,880.00 722.69,880.00 C722.44,880.00 718.54,883.47 714.03,887.72 C709.52,891.96 704.62,896.16 703.16,897.05 C701.70,897.95 699.88,899.42 699.13,900.34 ZM 187.75 446.92 C190.41,448.47 264.24,448.36 265.80,446.80 C266.71,445.89 267.00,427.42 267.00,369.80 C267.00,301.15 266.85,294.00 265.41,294.00 C263.43,294.00 259.67,296.78 251.14,304.57 C247.49,307.90 242.25,312.25 239.50,314.23 C236.75,316.20 233.41,318.98 232.08,320.41 C230.74,321.83 229.20,323.00 228.66,323.00 C228.11,323.00 224.66,325.81 220.99,329.25 C217.32,332.69 209.90,339.10 204.49,343.50 C199.09,347.90 192.72,353.24 190.33,355.38 L 186.00 359.25 L 186.00 402.58 C186.00,442.78 186.13,445.97 187.75,446.92 Z" className="fill-on-surface"/>
          <path d="M 567.56 1016.87 C564.41,1020.23 563.49,1020.60 562.46,1018.93 C562.09,1018.34 561.95,945.78 562.14,857.68 C562.43,724.08 562.26,696.84 561.12,693.50 C559.61,689.07 559.18,688.09 556.53,683.00 C553.38,676.94 553.00,676.06 553.00,674.86 C553.00,674.22 551.85,671.17 550.44,668.10 C549.02,665.02 547.27,661.15 546.53,659.50 C545.79,657.85 543.12,652.09 540.59,646.69 C538.07,641.30 536.00,636.49 536.00,636.02 C536.00,635.54 534.42,631.74 532.50,627.57 C530.58,623.40 529.00,619.73 529.00,619.41 C529.00,619.09 526.89,614.37 524.31,608.92 C520.43,600.71 519.24,599.00 517.39,599.00 C515.17,599.00 512.00,603.53 512.00,606.69 C512.00,607.45 510.88,610.29 509.50,613.00 C508.12,615.71 507.00,618.39 507.00,618.95 C507.00,619.50 504.98,624.13 502.50,629.22 C500.02,634.31 498.00,639.01 498.00,639.66 C498.00,640.31 496.88,643.08 495.50,645.81 C494.12,648.55 493.00,651.33 493.00,651.99 C493.00,652.65 492.35,654.39 491.55,655.85 C488.74,660.99 483.00,673.72 483.00,674.81 C483.00,675.42 480.98,679.85 478.50,684.66 C476.02,689.47 474.00,693.94 474.00,694.58 C474.00,695.23 473.32,696.32 472.49,697.01 C471.16,698.11 471.04,715.40 471.43,847.38 C471.67,929.40 472.15,1001.34 472.50,1007.26 L 472.55 1008.16 C472.92,1014.40 473.13,1017.90 471.83,1018.59 C470.18,1019.48 466.08,1015.81 456.77,1007.45 L 455.70 1006.50 C450.79,1002.10 445.59,997.63 444.14,996.58 C442.69,995.52 436.94,990.34 431.37,985.08 C425.80,979.81 416.38,971.45 410.44,966.50 C404.49,961.55 397.47,955.53 394.82,953.11 L 390.00 948.73 L 390.01 657.50 L 395.49 646.50 C398.51,640.45 400.98,634.98 400.99,634.35 C401.00,633.34 408.46,617.58 412.76,609.50 C414.56,606.12 414.71,605.80 418.54,597.50 C420.06,594.20 421.66,590.60 422.10,589.50 C422.53,588.40 425.16,582.69 427.94,576.80 C430.72,570.92 433.00,565.83 433.00,565.50 C433.00,565.16 435.02,560.64 437.50,555.45 C439.98,550.26 442.00,545.77 442.00,545.48 C442.00,545.20 443.12,543.18 444.50,541.00 C445.88,538.82 447.00,536.44 447.00,535.71 C447.00,534.98 448.52,531.26 450.37,527.44 C458.52,510.69 462.19,503.39 463.25,501.82 C464.13,500.53 464.03,499.39 462.80,496.82 C461.93,495.00 460.75,492.38 460.18,491.00 C459.62,489.62 455.29,480.61 450.58,470.96 C445.86,461.31 442.00,452.95 442.00,452.37 C442.00,451.80 440.42,448.09 438.50,444.14 C436.58,440.18 435.00,436.10 435.00,435.06 C435.00,434.02 434.66,433.02 434.25,432.83 C433.84,432.65 432.29,430.02 430.80,427.00 C420.95,406.90 413.00,390.16 413.00,389.51 C413.00,389.09 410.93,384.41 408.40,379.12 C405.88,373.83 403.22,368.15 402.50,366.50 C400.83,362.68 392.11,344.06 390.91,341.76 C390.38,340.75 390.00,284.92 390.00,207.52 L 390.00 75.02 L 397.75 67.63 C402.01,63.57 408.88,57.43 413.00,54.00 C417.12,50.56 423.31,45.02 426.75,41.67 C430.19,38.32 433.79,35.16 434.75,34.65 C435.71,34.14 440.35,30.07 445.06,25.61 C457.28,14.03 469.74,3.50 471.23,3.50 C472.21,3.50 472.44,6.77 472.21,18.00 C472.06,25.98 471.71,92.84 471.46,166.59 L 470.99 300.68 L 473.49 305.39 C474.87,307.98 476.00,310.71 476.00,311.45 C476.00,312.19 477.63,316.10 479.63,320.15 C481.63,324.19 483.83,328.85 484.52,330.50 C486.11,334.27 491.69,346.23 496.39,355.94 C498.38,360.03 500.00,363.89 500.00,364.50 C500.00,365.12 501.12,367.96 502.50,370.81 C503.88,373.66 505.00,376.45 505.00,377.01 C505.00,377.57 505.42,378.81 505.93,379.76 C507.28,382.28 513.58,396.02 514.86,399.25 C515.47,400.76 516.39,402.00 516.93,402.00 C517.93,402.00 524.07,389.81 528.01,380.00 C531.73,370.75 533.95,366.15 535.00,365.50 C535.55,365.16 536.00,363.94 536.00,362.80 C536.00,361.65 537.58,357.44 539.50,353.43 C541.42,349.43 543.00,345.74 543.00,345.24 C543.00,344.73 544.31,341.66 545.91,338.41 C548.46,333.21 551.29,326.92 553.94,320.50 C554.39,319.40 555.94,316.10 557.38,313.16 C558.82,310.22 560.00,307.05 560.00,306.11 C560.00,305.17 560.56,303.84 561.25,303.15 C562.24,302.16 562.51,271.29 562.53,155.70 C562.55,75.29 562.66,8.94 562.78,8.25 C563.16,6.12 564.51,6.82 570.47,12.25 C573.64,15.14 576.83,17.73 577.57,18.00 C578.30,18.27 583.58,23.11 589.30,28.75 C595.02,34.39 600.10,39.01 600.60,39.03 C601.09,39.05 604.20,41.55 607.50,44.58 C610.80,47.62 615.53,51.75 618.00,53.76 C620.47,55.77 625.73,60.36 629.67,63.96 C633.61,67.56 638.44,71.78 640.41,73.34 L 643.97 76.17 L 644.49 139.84 C644.77,174.85 645.23,233.54 645.51,270.25 L 646.03 337.00 L 641.42 345.75 C638.89,350.56 635.77,356.30 634.49,358.50 C633.21,360.70 632.12,363.12 632.08,363.88 C632.04,364.65 627.72,373.89 622.50,384.42 C617.28,394.96 613.00,404.13 613.00,404.80 C613.00,405.88 611.33,409.49 606.19,419.50 C600.09,431.38 596.00,440.02 596.00,441.02 C596.00,441.58 593.30,447.53 590.00,454.25 C586.70,460.96 584.00,466.98 584.00,467.62 C584.00,468.27 582.37,472.10 580.37,476.15 C578.37,480.19 576.06,485.08 575.22,487.00 C574.39,488.92 573.32,491.28 572.85,492.24 C571.38,495.23 571.89,497.57 575.63,505.15 C577.63,509.19 579.85,513.85 580.56,515.50 C582.63,520.29 585.97,527.29 587.48,530.00 C588.24,531.38 589.64,534.30 590.57,536.50 C591.51,538.70 595.39,547.03 599.21,555.00 C603.02,562.97 606.53,570.40 607.01,571.50 C607.49,572.60 610.16,578.31 612.94,584.20 C615.72,590.08 618.00,595.24 618.00,595.67 C618.00,596.10 620.92,602.40 624.49,609.67 C628.07,616.94 631.71,625.05 632.60,627.70 C633.48,630.34 634.84,633.21 635.60,634.08 C636.37,634.95 637.00,636.07 637.01,636.58 C637.01,637.09 639.03,641.55 641.49,646.50 L 645.96 655.50 L 645.98 799.64 C646.00,915.03 645.74,944.38 644.71,946.84 C643.59,949.50 638.18,954.73 625.18,965.70 C623.36,967.24 616.99,973.00 611.04,978.50 C597.20,991.29 581.89,1004.79 575.50,1009.81 C572.75,1011.98 569.18,1015.15 567.56,1016.87 Z" fill="rgb(253,0,0)"/>
          </g>
          </svg>
        </Link>
        <Link
          href={`/tournaments/${slug}/player`}
          className="flex flex-1 flex-col items-center gap-1 py-2 text-on-surface/60 transition-colors hover:text-on-surface"
        >
          <UserRound className="h-5 w-5" aria-hidden="true" />
          <span className="text-[10px] font-medium">Player</span>
        </Link>
        <Link
          href={`/tournaments/${slug}`}
          className="flex flex-1 flex-col items-center gap-1 py-2 text-on-surface/60 transition-colors hover:text-on-surface"
        >
          <Trophy className="h-5 w-5" aria-hidden="true" />
          <span className="text-[10px] font-medium">Tournament</span>
        </Link>
      </nav>

      <ConfirmResultDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        player1Name={name1}
        player2Name={name2}
        score1={score1}
        score2={score2}
        onBothConfirmed={handleBothConfirmed}
        saving={saving}
        error={saveError}
      />

      <JudgeViewResultDialog
        open={viewResultOpen}
        onOpenChange={setViewResultOpen}
        round={matchContext?.round ?? null}
        matchNumber={matchContext?.matchNumber ?? null}
        player1Name={name1}
        player2Name={name2}
        player1={player1}
        player2={player2}
        score1={score1}
        score2={score2}
      />

      <JudgeStadiumPromptDialog
        open={stadiumPromptOpen}
        onOpenChange={setStadiumPromptOpen}
        stations={stations}
        onSelect={handleStationChange}
      />
    </div>
  );
}
