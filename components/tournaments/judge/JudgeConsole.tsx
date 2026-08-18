"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, RefreshCw, Trash2, Trophy } from "lucide-react";

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
import { startMatch, submitJudgedMatchResult } from "@/app/account/organizer/tournament/[slug]/matches-actions";
import { assignStationMatch } from "@/app/account/organizer/tournament/[slug]/workspace-panels-actions";
import { getParticipantComboSlots, signOutJudgeSession, setOwnStation, uploadMatchScreenshot } from "@/app/tournaments/[slug]/judge/actions";
import { captureElementAsWebp } from "@/lib/images/screenshot";
import { cn } from "@/lib/utils";
import type { FinishType, MatchBattle, MatchBattleCombo } from "@/lib/types/database";

export interface JudgeMatchLite {
  id: string;
  round: number;
  matchNumber: number;
  groupId: string | null;
  participantAId: string | null;
  participantBId: string | null;
}

export interface JudgeMatchContext {
  matchId: string;
  round: number;
  matchNumber: number;
  stage: string;
  participantAId: string;
  participantBId: string;
}

export interface JudgeStationOption {
  id: string;
  name: string;
  currentMatchId: string | null;
}

type Side = "left" | "right";

const NAV_ITEMS = [
  { id: "switch", label: "Switch", sub: "Swap players side", icon: RefreshCw },
  { id: "clear", label: "Clear", sub: "Clear players and scores", icon: Trash2 },
] as const;

export function JudgeConsole({
  slug,
  tournamentId,
  tournamentTitle,
  stations,
  initialStationId,
  judgeName,
  judgeUsername,
  participants,
  matches,
  groups,
  initialMatch,
}: {
  slug: string;
  tournamentId: string;
  tournamentTitle: string;
  stations: JudgeStationOption[];
  initialStationId: string | null;
  judgeName: string;
  judgeUsername: string;
  participants: JudgePlayerOption[];
  matches: JudgeMatchLite[];
  groups: { id: string; label: string }[];
  initialMatch: JudgeMatchContext | null;
}) {
  const groupLabelById = useMemo(() => new Map(groups.map((g) => [g.id, g.label])), [groups]);

  const [player1, setPlayer1] = useState<PlayerScoreState>(() => ({
    ...emptyPlayerScoreState(),
    participantId: initialMatch?.participantAId ?? null,
  }));
  const [player2, setPlayer2] = useState<PlayerScoreState>(() => ({
    ...emptyPlayerScoreState(),
    participantId: initialMatch?.participantBId ?? null,
  }));
  const [matchContext, setMatchContext] = useState<JudgeMatchContext | null>(initialMatch);
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
  const seqRef = useRef(0);
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
  // by hand. Fire-and-forget, same as setOwnStation below: nothing here
  // blocks the console's own UI on the round trip.
  function startMatchAtStation(matchId: string, forStationId: string | null) {
    void startMatch(matchId, slug);
    if (forStationId) void assignStationMatch(forStationId, slug, matchId);
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

  // Picking a participant on either side looks up their one active
  // (non-completed) match and fills the *other* side with the real
  // opponent, plus the round/stage that match is actually part of.
  function selectPlayer(side: Side, participantId: string) {
    const match = matches.find((m) => m.participantAId === participantId || m.participantBId === participantId);
    const picked: PlayerScoreState = { participantId, events: [], penaltyProgress: 0, comboSlots: null };

    if (!match || !match.participantAId || !match.participantBId) {
      stateSetter(side)(picked);
      stateSetter(side === "left" ? "right" : "left")(emptyPlayerScoreState());
      setMatchContext(null);
      return;
    }

    const opponentId = match.participantAId === participantId ? match.participantBId : match.participantAId;
    const opponent: PlayerScoreState = { participantId: opponentId, events: [], penaltyProgress: 0, comboSlots: null };
    stateSetter(side)(picked);
    stateSetter(side === "left" ? "right" : "left")(opponent);
    setMatchContext({
      matchId: match.id,
      round: match.round,
      matchNumber: match.matchNumber,
      stage: match.groupId ? `Group ${groupLabelById.get(match.groupId) ?? "?"}` : "Final Stage",
      participantAId: match.participantAId,
      participantBId: match.participantBId,
    });
    startMatchAtStation(match.id, stationId);
  }

  // Fills both sides from whatever match a stadium is currently running —
  // same shape of fill as the initial server-side load (see
  // app/tournaments/[slug]/judge/page.tsx), just re-runnable every time the
  // Stadium field changes instead of only once at mount. `forStationId` is
  // the stadium being switched *to* — passed explicitly rather than read
  // off the `stationId` state, since the caller's own setStationId hasn't
  // committed yet when this runs.
  function applyStationMatch(currentMatchId: string | null, forStationId: string | null) {
    if (!currentMatchId) return;
    const stationMatch = matches.find((m) => m.id === currentMatchId);
    if (!stationMatch?.participantAId || !stationMatch?.participantBId) return;
    setPlayer1({ participantId: stationMatch.participantAId, events: [], penaltyProgress: 0, comboSlots: null });
    setPlayer2({ participantId: stationMatch.participantBId, events: [], penaltyProgress: 0, comboSlots: null });
    setMatchContext({
      matchId: stationMatch.id,
      round: stationMatch.round,
      matchNumber: stationMatch.matchNumber,
      stage: stationMatch.groupId ? `Group ${groupLabelById.get(stationMatch.groupId) ?? "?"}` : "Final Stage",
      participantAId: stationMatch.participantAId,
      participantBId: stationMatch.participantBId,
    });
    startMatchAtStation(stationMatch.id, forStationId);
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
      if (station) applyStationMatch(station.currentMatchId, resolved);
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

  function handleClear() {
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

    // Proof-of-result screenshot of the console itself (both scorecards,
    // header, everything in consoleRef) — deliberately not document.body,
    // since that would also pick up the Confirm Result dialog's portal
    // (see consoleRef's comment above). Best-effort: a capture or upload
    // failure shouldn't block the actual result from being saved, just
    // leave it without a screenshot.
    let screenshotUrl: string | undefined;
    try {
      const webpBlob = await captureElementAsWebp(consoleRef.current ?? document.body);
      const webpFile = new File([webpBlob], "match-screenshot.webp", { type: "image/webp" });
      const formData = new FormData();
      formData.set("file", webpFile);
      const uploadResult = await uploadMatchScreenshot(tournamentId, matchContext.matchId, formData);
      if (uploadResult.status === "success" && uploadResult.url) screenshotUrl = uploadResult.url;
    } catch {
      // Ignored — see comment above.
    }

    const result = await submitJudgedMatchResult(matchContext.matchId, slug, {
      scoreA: ownScore(aState) + committedPenalties(bState),
      scoreB: ownScore(bState) + committedPenalties(aState),
      battles,
      penaltiesA: committedPenalties(aState),
      penaltiesB: committedPenalties(bState),
      judgeName,
      judgeUsername,
      participantAName: aName,
      participantBName: bName,
      screenshotUrl,
      station: stationId ? (stations.find((s) => s.id === stationId)?.name ?? undefined) : undefined,
    });

    setSaving(false);
    if (result.status === "error") {
      setSaveError(result.message ?? "Something went wrong.");
      return;
    }
    // The match is done — free up the stadium it was running at for
    // whichever match gets picked next, same "clear" assignStationMatch(...,
    // null) already gives the organizer's own Stations page.
    if (stationId) void assignStationMatch(stationId, slug, null);
    setConfirmOpen(false);
    handleClear();
  }

  const score1 = ownScore(player1) + committedPenalties(player2);
  const score2 = ownScore(player2) + committedPenalties(player1);
  const name1 = participants.find((p) => p.id === player1.participantId)?.displayName ?? "Player 1";
  const name2 = participants.find((p) => p.id === player2.participantId)?.displayName ?? "Player 2";
  const combo1 = comboForNextBattle(player1, player2);
  const combo2 = comboForNextBattle(player2, player1);

  return (
    <div ref={consoleRef} className="mx-auto flex max-w-[1440px]">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-outline-variant/25 bg-surface-container-lowest lg:flex">
        <div className="p-4">
          <Link href="/" className="heading text-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="200" height="25" viewBox="0 0 2102 226">
            <g>
            <path d="M 1748.82 181.70 L 1737.50 192.90 L 1678.18 193.20 C1645.55,193.37 1618.21,193.14 1617.43,192.70 C1616.21,192.02 1616.00,180.71 1616.00,116.01 C1616.00,56.39 1616.27,39.94 1617.25,39.31 C1617.94,38.86 1645.24,38.37 1677.93,38.22 L 1737.35 37.94 L 1763.00 63.58 L 1763.00 114.34 C1763.00,156.43 1762.76,165.56 1761.57,167.80 C1760.78,169.28 1755.05,175.54 1748.82,181.70 ZM 892.54 191.94 C891.82,193.11 861.81,193.48 860.67,192.33 C860.30,191.97 860.00,171.04 860.00,145.83 L 860.00 100.00 L 862.80 100.00 C864.34,100.00 866.03,99.60 866.55,99.10 C868.40,97.36 892.23,94.76 893.12,96.20 C893.48,96.78 894.08,100.00 894.46,103.36 C894.84,106.72 895.68,109.81 896.33,110.22 C896.97,110.63 915.16,110.98 936.75,110.98 L 975.99 111.00 L 984.00 103.77 L 984.00 77.39 L 977.40 71.00 L 876.19 71.00 L 872.35 65.40 C870.23,62.32 867.83,58.82 867.00,57.63 C866.17,56.44 863.47,52.82 861.00,49.60 C860.62,49.11 860.27,48.65 859.93,48.20 C854.98,41.77 853.85,40.31 854.21,39.60 C854.34,39.34 854.67,39.18 855.07,38.92 C855.91,38.39 885.34,38.11 926.19,38.25 L 995.88 38.50 L 1006.94 49.49 L 1018.00 60.47 L 1018.00 119.61 L 1006.16 131.30 L 994.31 143.00 L 987.72 143.00 C984.09,143.00 980.85,143.43 980.53,143.95 C980.21,144.47 983.11,148.63 986.97,153.20 C1015.38,186.76 1018.38,190.57 1017.51,191.99 C1017.12,192.62 1009.28,193.00 996.84,193.00 L 976.80 193.00 L 973.65 189.74 C971.92,187.94 969.15,184.70 967.50,182.53 C965.85,180.36 960.22,173.54 955.00,167.36 C949.78,161.18 943.04,153.17 940.03,149.56 L 934.56 143.00 L 914.84 143.00 C900.16,143.00 894.91,143.32 894.31,144.25 C893.86,144.94 893.43,155.71 893.35,168.19 C893.26,180.67 892.90,191.35 892.54,191.94 ZM 380.73 192.19 C379.23,193.14 349.61,193.27 348.67,192.33 C348.30,191.97 348.00,171.62 348.00,147.12 L 348.00 102.58 L 350.75 100.28 C352.26,99.02 357.08,95.18 361.45,91.75 C365.83,88.31 371.99,83.09 375.14,80.15 C378.30,77.21 381.30,75.07 381.81,75.38 C382.35,75.72 382.53,82.59 382.23,91.96 C381.84,104.00 382.03,108.33 382.98,109.48 C384.07,110.79 389.69,111.00 424.65,111.00 L 465.05 111.00 L 466.12 108.25 C466.75,106.62 467.02,100.89 466.78,94.22 L 466.37 82.93 L 460.47 76.97 L 454.56 71.00 L 366.24 71.00 L 363.62 67.57 C362.18,65.68 361.00,63.87 361.00,63.56 C361.00,63.24 359.34,60.62 357.30,57.74 C350.06,47.48 345.83,40.83 346.27,40.39 C347.58,39.09 391.84,37.91 429.55,38.19 L 472.60 38.50 L 482.05 48.36 C487.25,53.79 491.67,58.69 491.88,59.26 C492.09,59.82 494.23,62.36 496.63,64.89 L 500.99 69.50 L 500.99 130.64 C501.00,185.48 500.84,191.85 499.42,192.39 C497.09,193.28 469.71,193.10 468.27,192.19 C467.36,191.61 466.97,185.08 466.77,167.45 L 466.50 143.50 L 382.50 143.50 L 382.23 167.45 C382.03,185.08 381.64,191.61 380.73,192.19 ZM 1890.59 193.34 C1870.84,194.11 1813.19,194.09 1811.00,193.31 C1810.18,193.02 1803.99,187.32 1797.25,180.65 L 1785.00 168.53 L 1785.00 61.47 L 1808.03 38.50 L 1866.27 38.21 C1898.29,38.05 1925.51,38.17 1926.75,38.48 C1929.76,39.23 1929.51,40.66 1925.44,46.00 C1923.55,48.47 1920.94,52.08 1919.64,54.01 C1918.34,55.95 1916.54,58.14 1915.64,58.89 C1914.74,59.63 1914.00,60.67 1914.00,61.18 C1914.00,61.70 1912.33,64.12 1910.29,66.56 L 1906.58 71.00 L 1827.41 71.00 L 1823.70 74.79 L 1820.00 78.58 L 1820.00 153.59 L 1823.79 157.30 L 1827.58 161.00 L 1888.59 161.00 L 1892.30 157.21 L 1896.00 153.42 L 1896.00 132.00 L 1884.56 132.00 C1877.92,132.00 1872.86,131.58 1872.49,130.99 C1871.91,130.05 1872.62,128.93 1878.75,121.09 C1879.99,119.51 1881.00,117.78 1881.00,117.26 C1881.00,116.74 1881.90,115.50 1883.00,114.50 C1884.10,113.50 1885.00,112.19 1885.00,111.58 C1885.00,110.97 1886.59,108.11 1888.54,105.21 L 1892.08 99.96 L 1910.79 100.23 L 1929.50 100.50 L 1929.76 135.10 L 1930.03 169.70 L 1918.76 181.19 L 1907.50 192.68 ZM 40.50 191.83 C39.18,193.06 13.15,193.97 10.24,192.89 L 7.98 192.06 L 8.24 146.86 L 8.50 101.67 L 11.50 100.76 C13.15,100.26 15.40,99.49 16.50,99.04 C20.76,97.31 27.50,95.78 37.11,94.35 L 40.72 93.82 L 41.45 101.16 C41.84,105.20 42.64,109.06 43.21,109.75 C44.00,110.71 53.10,111.00 82.42,111.00 L 120.59 111.00 L 124.30 107.21 L 128.00 103.42 L 128.00 71.00 L 24.35 71.00 L 22.36 68.75 C21.26,67.51 17.64,62.45 14.32,57.50 C10.99,52.55 6.89,46.48 5.21,44.01 C3.08,40.86 2.51,39.29 3.33,38.77 C5.38,37.47 146.72,37.85 151.38,39.17 C153.65,39.81 156.74,41.47 158.25,42.85 L 161.00 45.37 L 161.00 120.53 L 149.74 131.76 L 138.49 142.98 L 90.49 143.24 L 42.50 143.50 L 42.00 167.20 C41.71,181.03 41.08,191.29 40.50,191.83 ZM 1557.46 193.10 L 1547.43 193.19 C1478.37,193.80 1475.25,193.83 1473.01,192.44 C1472.80,192.31 1472.60,192.16 1472.35,192.01 C1470.78,191.02 1464.91,185.55 1459.30,179.86 L 1449.10 169.50 L 1448.88 112.31 C1448.64,53.94 1448.75,52.00 1452.27,52.00 C1452.84,52.00 1454.85,50.40 1456.74,48.45 C1462.74,42.28 1466.89,40.27 1475.32,39.48 L 1483.00 38.77 L 1483.00 152.42 L 1487.21 156.71 L 1491.42 161.00 L 1549.42 161.00 L 1558.00 152.58 L 1558.00 96.35 C1558.00,52.46 1558.27,39.94 1559.25,39.32 C1561.48,37.90 1590.85,37.63 1592.52,39.02 C1593.80,40.08 1594.00,48.94 1594.00,104.33 L 1594.00 168.41 L 1581.71 180.71 L 1569.41 193.00 ZM 585.77 214.60 C583.72,215.92 581.82,217.00 581.55,217.00 C581.28,217.00 580.93,195.95 580.78,170.22 C580.50,123.96 580.48,123.42 578.33,120.69 C574.86,116.28 540.39,77.42 530.52,66.79 C508.22,42.77 505.74,39.93 506.43,39.24 C506.83,38.83 516.82,38.50 528.63,38.50 L 550.09 38.50 L 557.30 46.11 C561.26,50.30 565.14,54.58 565.92,55.61 C567.25,57.38 570.16,60.50 590.29,81.77 C594.58,86.30 598.42,90.00 598.82,90.00 C599.82,90.00 613.26,76.34 616.70,71.82 C620.16,67.28 643.68,40.97 645.82,39.25 C646.79,38.48 650.54,38.00 655.67,38.00 C663.20,38.00 664.08,38.21 665.30,40.25 C666.04,41.49 668.03,44.82 669.73,47.66 C671.42,50.50 673.11,53.77 673.47,54.92 C674.19,57.17 674.00,57.44 661.50,71.67 C657.65,76.06 651.12,83.64 647.00,88.52 C642.88,93.40 636.80,100.43 633.50,104.14 C630.20,107.85 625.14,113.57 622.25,116.83 L 617.00 122.78 L 617.00 191.82 L 614.07 194.16 C612.46,195.45 609.64,197.53 607.82,198.79 C605.99,200.05 601.12,203.58 597.00,206.64 C592.88,209.70 587.82,213.28 585.77,214.60 ZM 1413.22 181.28 L 1401.44 193.03 L 1360.97 193.29 C1338.71,193.43 1314.56,193.31 1307.29,193.02 L 1294.09 192.50 L 1289.96 188.50 C1284.32,183.03 1282.81,179.74 1281.96,171.05 C1281.28,164.18 1281.39,163.48 1283.36,161.93 C1287.08,159.01 1302.28,149.00 1303.00,149.00 C1303.38,149.00 1304.50,148.10 1305.50,147.00 C1306.50,145.90 1307.85,145.00 1308.50,145.00 C1309.15,145.00 1310.50,144.10 1311.50,143.00 C1315.09,139.03 1315.91,140.37 1316.21,150.75 L 1316.50 160.50 L 1349.45 160.76 L 1382.40 161.03 L 1386.70 156.81 L 1391.00 152.58 L 1391.12 29.50 L 1396.66 25.00 C1401.92,20.73 1409.48,14.37 1418.61,6.53 C1420.87,4.59 1423.23,3.00 1423.86,3.00 C1424.70,3.00 1425.00,24.57 1425.00,86.27 L 1425.00 169.53 ZM 819.03 190.75 L 816.92 193.00 L 752.13 193.00 C716.49,193.00 687.03,192.70 686.67,192.33 C686.30,191.97 686.00,171.04 686.00,145.83 L 686.00 100.00 L 752.50 100.00 C794.91,100.00 819.00,100.35 819.00,100.97 C819.00,101.51 816.19,106.04 812.75,111.04 C809.31,116.05 805.83,121.14 805.00,122.36 C804.17,123.58 802.21,126.25 800.63,128.29 L 797.76 132.00 L 720.16 132.00 L 719.81 145.25 C719.62,152.54 719.86,159.06 720.35,159.75 C721.05,160.73 734.16,161.00 780.12,161.00 C829.47,161.00 839.00,161.22 839.00,162.38 C839.00,163.14 838.31,164.33 837.47,165.02 C836.63,165.72 832.61,171.29 828.54,177.40 C824.47,183.50 820.19,189.51 819.03,190.75 ZM 2079.85 190.64 C2077.51,192.78 2077.20,192.79 2016.27,193.20 C1982.60,193.42 1954.36,193.22 1953.52,192.75 C1952.20,192.01 1952.00,186.53 1952.00,150.50 C1952.00,122.64 1952.36,108.31 1953.09,106.69 C1953.77,105.21 1956.16,103.47 1959.36,102.14 C1964.45,100.04 1965.51,100.00 2022.27,100.00 C2066.18,100.00 2080.00,100.28 2080.00,101.19 C2080.00,102.44 2079.80,102.77 2069.52,118.42 C2065.93,123.87 2063.00,128.72 2063.00,129.19 C2063.00,131.50 2055.60,132.00 2021.43,132.00 L 1985.00 132.00 L 1985.00 161.00 L 2042.00 161.00 C2078.14,161.00 2099.00,161.35 2099.00,161.97 C2099.00,163.35 2095.24,169.88 2092.07,174.00 C2090.60,175.93 2087.77,179.98 2085.79,183.00 C2083.82,186.02 2081.14,189.47 2079.85,190.64 ZM 304.50 192.47 C300.03,193.56 184.51,193.31 183.25,192.22 C183.11,192.10 183.00,157.61 183.00,115.57 L 183.00 39.13 L 185.25 38.48 C186.49,38.12 191.20,36.05 195.71,33.88 C202.31,30.72 214.82,26.00 216.63,26.00 C216.83,26.00 217.00,55.66 217.00,91.92 C217.00,128.17 217.27,158.55 217.61,159.42 C218.15,160.83 223.93,161.00 272.61,161.00 C302.52,161.00 327.00,161.35 327.00,161.78 C327.00,162.61 318.78,174.53 314.79,179.50 C313.46,181.15 311.05,184.64 309.44,187.24 C307.82,189.85 305.60,192.21 304.50,192.47 ZM 1652.33 159.75 C1652.93,160.71 1660.73,161.00 1685.77,161.00 L 1718.42 161.00 L 1727.00 152.58 L 1727.00 78.88 L 1720.64 70.97 L 1686.10 71.24 L 1651.55 71.50 L 1651.55 115.00 C1651.55,138.93 1651.90,159.06 1652.33,159.75 ZM 823.67 66.00 L 820.33 70.50 L 702.25 71.02 L 699.62 67.57 C698.18,65.68 697.00,63.72 697.00,63.22 C697.00,62.72 696.04,61.45 694.87,60.40 C693.70,59.36 690.01,54.90 686.66,50.50 C683.32,46.10 679.95,41.85 679.18,41.06 C677.97,39.83 678.09,39.51 680.05,38.79 C682.70,37.80 840.51,38.17 841.50,39.16 C842.67,40.33 840.20,44.16 831.42,54.77 C829.72,56.82 828.03,59.17 827.67,60.00 C827.30,60.83 825.50,63.53 823.67,66.00 ZM 2081.67 66.63 L 2077.83 71.00 L 1968.17 71.00 L 1965.29 67.25 C1963.70,65.19 1961.53,62.20 1960.45,60.61 C1959.38,59.02 1957.60,56.49 1956.50,54.99 C1947.64,42.89 1945.81,39.74 1947.13,38.90 C1949.08,37.66 2099.72,37.74 2100.49,38.98 C2100.82,39.52 2099.37,42.33 2097.27,45.23 C2095.17,48.13 2091.66,53.15 2089.48,56.38 C2087.29,59.62 2083.77,64.23 2081.67,66.63 Z" className="fill-on-surface"></path>

            <path d="M 1094.50 209.79 L 1080.50 224.91 L 1054.31 224.96 C1038.48,224.98 1027.88,224.62 1027.52,224.03 C1026.96,223.12 1031.41,217.11 1040.16,207.00 C1042.30,204.52 1046.63,199.54 1049.78,195.92 C1061.11,182.88 1066.47,176.60 1071.79,170.11 C1074.76,166.48 1079.97,160.49 1083.35,156.81 C1086.73,153.12 1093.10,146.01 1097.50,141.01 C1101.90,136.00 1108.31,128.86 1111.75,125.13 C1115.83,120.70 1118.00,117.50 1118.00,115.92 C1118.00,112.63 1114.15,107.99 1062.78,49.33 C1059.33,45.39 1053.13,38.19 1049.02,33.33 C1044.91,28.47 1038.27,20.97 1034.27,16.66 C1030.26,12.35 1027.24,8.41 1027.55,7.91 C1027.87,7.40 1039.45,6.99 1053.81,6.97 L 1079.50 6.94 L 1097.86 25.72 C1107.96,36.05 1124.58,53.16 1134.79,63.75 C1145.00,74.34 1153.91,83.00 1154.59,83.00 C1155.26,83.00 1159.80,78.67 1164.66,73.38 C1169.52,68.10 1177.78,59.19 1183.00,53.59 C1188.22,47.99 1200.12,35.21 1209.44,25.20 L 1226.37 7.00 L 1252.76 7.00 C1275.27,7.00 1279.10,7.21 1278.82,8.45 C1278.52,9.80 1268.94,21.02 1254.00,37.52 C1250.43,41.46 1244.12,48.66 1240.00,53.50 C1235.88,58.35 1230.47,64.64 1228.00,67.48 C1225.53,70.33 1219.22,77.76 1214.00,83.99 C1208.78,90.23 1201.97,98.10 1198.88,101.50 C1195.80,104.89 1192.48,108.86 1191.52,110.33 C1188.81,114.46 1187.79,113.60 1188.46,107.75 C1189.27,100.77 1188.04,96.60 1185.05,96.16 C1183.77,95.98 1182.45,96.27 1182.11,96.81 C1180.69,99.11 1168.89,112.90 1161.10,121.37 C1148.45,135.12 1145.00,140.04 1145.00,144.28 C1145.00,146.26 1145.45,148.16 1146.00,148.50 C1149.47,150.64 1144.22,157.69 1122.10,180.58 C1114.62,188.32 1102.20,201.47 1094.50,209.79 ZM 1280.90 224.08 C1278.99,225.29 1229.94,225.19 1227.85,223.98 C1226.95,223.45 1222.04,218.40 1216.95,212.76 C1211.86,207.12 1196.60,191.02 1183.04,177.00 C1169.47,162.98 1158.04,150.94 1157.63,150.25 C1156.91,149.05 1159.97,145.34 1177.51,126.10 C1180.82,122.47 1184.54,118.15 1185.77,116.50 L 1188.00 113.50 L 1191.25 117.50 C1193.04,119.69 1196.97,124.21 1200.00,127.53 C1206.44,134.59 1220.06,150.39 1224.83,156.35 C1226.67,158.63 1230.94,163.47 1234.33,167.11 C1237.72,170.74 1242.97,176.74 1246.00,180.44 C1249.03,184.14 1255.62,191.74 1260.65,197.34 C1265.68,202.93 1271.75,209.93 1274.15,212.89 L 1274.72 213.60 C1280.74,221.06 1282.05,222.68 1281.66,223.46 C1281.54,223.70 1281.26,223.86 1280.90,224.08 Z" fill="rgb(250,2,2)"></path>
            </g>
            </svg>
          </Link>
          <p className="label-mono mt-4 text-primary">Judge Console</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {NAV_ITEMS.map(({ id, label, sub, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={id === "switch" ? handleSwitch : handleClear}
              className="flex w-full items-center gap-3 px-2 py-3 text-left text-on-surface/70 transition-colors hover:bg-surface-container-high hover:text-on-surface"
            >
              <Icon className="h-5 w-5 shrink-0 text-on-surface/40" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-on-surface">{label}</span>
                <span className="label-mono block text-[10px] text-on-surface/40">{sub}</span>
              </span>
            </button>
          ))}
          <Link
            href={`/tournaments/${slug}/player`}
            className="flex w-full items-center gap-3 px-2 py-3 text-on-surface/70 transition-colors hover:bg-surface-container-high hover:text-on-surface"
          >
            <Trophy className="h-5 w-5 shrink-0 text-on-surface/40" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-on-surface">Tournament</span>
              <span className="label-mono block text-[10px] text-on-surface/40">Visit the tournament</span>
            </span>
          </Link>
          <form action={signOutJudgeSession.bind(null, slug)}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 px-2 py-3 text-left text-on-surface/70 transition-colors hover:bg-surface-container-high hover:text-on-surface"
            >
              <LogOut className="h-5 w-5 shrink-0 text-on-surface/40" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-on-surface">Sign Out</span>
                <span className="label-mono block text-[10px] text-on-surface/40">Back to tournament details</span>
              </span>
            </button>
          </form>
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="border-b border-outline-variant/25 px-4 py-5 md:px-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="w-10" aria-hidden="true" />
            <p className="label-mono text-center text-on-surface/40">{tournamentTitle}</p>
            <ThemeToggle />
          </div>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <JudgePlayerPicker
                label="Player 1"
                sideLabel="[X Side]"
                options={participants}
                selectedId={player1.participantId}
                onSelect={(id) => selectPlayer("left", id)}
              />
              {combo1 ? <p className="mt-1 truncate text-xs text-on-surface/50">Using: <span className="text-on-surface/80">{combo1.name}</span></p> : null}
            </div>
            <div className="shrink-0 pt-1 text-center">
              <p className="label-mono text-primary">{matchContext ? `Round ${matchContext.round}` : "—"}</p>
              <p className="label-mono text-[10px] text-on-surface/40">{matchContext?.stage ?? "No match"}</p>
            </div>
            <div className="min-w-0 text-right">
              <JudgePlayerPicker
                label="Player 2"
                sideLabel="[B Side]"
                options={participants}
                selectedId={player2.participantId}
                onSelect={(id) => selectPlayer("right", id)}
                align="right"
              />
              {combo2 ? <p className="mt-1 truncate text-xs text-on-surface/50">Using: <span className="text-on-surface/80">{combo2.name}</span></p> : null}
            </div>
          </div>
        </header>

        <div className="grid gap-4 lg:gap-6 px-4 py-4 lg:py-8 pb-24 md:px-8 grid-cols-[1fr_auto_1fr] lg:pb-8">
          <PlayerScorePanel
            state={player1}
            bonusPenalties={committedPenalties(player2)}
            onIncrementFinish={(kind) => incrementFinish("left", kind)}
            onDecrementFinish={(kind) => decrementFinish("left", kind)}
            onPenaltyPlus={() => penaltyPlus("left")}
            onPenaltyMinus={() => penaltyMinus("left")}
          />

          <div className="flex flex-col items-center gap-4 lg:w-56">
            <div className="w-full space-y-2 border border-outline-variant/25 bg-surface-container-low p-4">
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
          className="flex flex-1 flex-col items-center gap-1 py-2.5 text-on-surface/60 transition-colors hover:text-primary"
        >
          <RefreshCw className="h-5 w-5" aria-hidden="true" />
          <span className="label-mono !text-[8px]">Switch</span>
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="flex flex-1 flex-col items-center gap-1 py-2.5 text-on-surface/60 transition-colors hover:text-primary"
        >
          <Trash2 className="h-5 w-5" aria-hidden="true" />
          <span className="label-mono !text-[8px]">Clear</span>
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
          className="flex flex-1 flex-col items-center gap-1 py-2.5 text-on-surface/60 transition-colors hover:text-primary"
        >
          <Trophy className="h-5 w-5" aria-hidden="true" />
          <span className="label-mono !text-[8px]">Tournament</span>
        </Link>
        <form action={signOutJudgeSession.bind(null, slug)} className="flex flex-1">
          <button type="submit" className="flex flex-1 flex-col items-center gap-1 py-2.5 text-on-surface/60 transition-colors hover:text-primary">
            <LogOut className="h-5 w-5" aria-hidden="true" />
            <span className="label-mono !text-[8px]">Sign Out</span>
          </button>
        </form>
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
