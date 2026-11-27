"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
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
import { BlurLoadingOverlay } from "@/components/tournaments/player/BlurLoadingOverlay";

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

  // The sidebar (rendered by the route's layout) fires these window events
  // for its Switch / Clear items; a ref keeps the handlers current.
  const actionsRef = useRef({ handleSwitch, handleClear });
  actionsRef.current = { handleSwitch, handleClear };
  useEffect(() => {
    const onSwitch = () => actionsRef.current.handleSwitch();
    const onClear = () => actionsRef.current.handleClear();
    window.addEventListener("judge:switch", onSwitch);
    window.addEventListener("judge:clear", onClear);
    return () => {
      window.removeEventListener("judge:switch", onSwitch);
      window.removeEventListener("judge:clear", onClear);
    };
  }, []);

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
    <div ref={consoleRef} className="flex bg-background text-on-surface">
      <BlurLoadingOverlay show={saving} label="Saving result…" />
      <div className="min-w-0 flex-1">
        <header className="relative border-b border-outline-variant/25 px-4 lg:px-6 py-5 max-lg:landscape:rounded-lg max-lg:landscape:border-b-0 max-lg:landscape:py-2 max-lg:portrait:border-b-0 max-lg:portrait:py-2">
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

        <div className="grid gap-4 lg:gap-6 px-4 lg:px-6 py-4 grid-cols-[1fr_1fr_1fr] lg:grid-cols-[1fr_auto_1fr]">
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
