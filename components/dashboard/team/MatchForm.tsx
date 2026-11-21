"use client";

import { useMemo, useState } from "react";
import { useBusyTransition } from "@/components/dashboard/DashboardBusy";
import { useRouter } from "next/navigation";
import { Plus, Swords, Trash2 } from "lucide-react";

import { createLeagueMatch, updateLeagueMatch } from "@/app/account/team/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormStatus } from "@/components/dashboard/team/FormField";
import { BATTLE_FINISHES, BATTLE_FINISH_LABEL, BATTLE_FINISH_POINTS } from "@/lib/teams/constants";
import type { BeybladeOption, LeagueMatchRow, ProfileSummary } from "@/lib/teams/queries";
import type { BattleOutcome, FinishType } from "@/lib/types/database";
import { cn } from "@/lib/utils";

interface BattleDraft {
  key: number;
  outcome: BattleOutcome;
  finish: FinishType;
  playerBeybladeId: string;
  opponentBeybladeId: string;
}

type Errors = Record<string, string[] | undefined>;

export function MatchForm({
  leagueId,
  teamSlug,
  players,
  defaultPlayerId,
  canPickAnyPlayer,
  blades,
  match,
}: {
  leagueId: string;
  teamSlug: string;
  // Roster players the viewer may log for (just themselves unless a manager).
  players: ProfileSummary[];
  defaultPlayerId?: string;
  canPickAnyPlayer: boolean;
  blades: BeybladeOption[];
  // Present when editing.
  match?: LeagueMatchRow;
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [profileId, setProfileId] = useState(match?.player.id ?? defaultPlayerId ?? players[0]?.id ?? "");
  const [opponentName, setOpponentName] = useState(match?.opponentName ?? "");
  const [opponentTeam, setOpponentTeam] = useState(match?.opponentTeam ?? "");
  const [playerPoints, setPlayerPoints] = useState(String(match?.playerPoints ?? ""));
  const [opponentPoints, setOpponentPoints] = useState(String(match?.opponentPoints ?? ""));
  const [playedOn, setPlayedOn] = useState(match?.playedOn ?? today);
  const [notes, setNotes] = useState(match?.notes ?? "");
  const [battles, setBattles] = useState<BattleDraft[]>(
    (match?.battles ?? []).map((b, i) => ({
      key: i,
      outcome: b.outcome,
      finish: b.finish,
      playerBeybladeId: b.playerBeybladeId ?? "",
      opponentBeybladeId: b.opponentBeybladeId ?? "",
    }))
  );
  const [nextKey, setNextKey] = useState(battles.length);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<{ status: "success" | "error"; message?: string } | null>(null);
  const [pending, startTransition] = useBusyTransition();

  // Points implied by the battles: a win scores the finish's points for the
  // player, a loss scores them for the opponent.
  const battleTotals = useMemo(
    () =>
      battles.reduce(
        (acc, b) => {
          const pts = BATTLE_FINISH_POINTS[b.finish];
          if (b.outcome === "win") acc.player += pts;
          else acc.opponent += pts;
          return acc;
        },
        { player: 0, opponent: 0 }
      ),
    [battles]
  );
  const totalsDiffer =
    battles.length > 0 && (String(battleTotals.player) !== playerPoints || String(battleTotals.opponent) !== opponentPoints);

  const addBattle = () => {
    const prev = battles[battles.length - 1];
    setBattles((list) => [
      ...list,
      {
        key: nextKey,
        outcome: "win",
        finish: "spin",
        // Same Beyblades as the previous battle is the common case.
        playerBeybladeId: prev?.playerBeybladeId ?? "",
        opponentBeybladeId: prev?.opponentBeybladeId ?? "",
      },
    ]);
    setNextKey((k) => k + 1);
  };

  const updateBattle = (key: number, patch: Partial<BattleDraft>) =>
    setBattles((list) => list.map((b) => (b.key === key ? { ...b, ...patch } : b)));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const input = {
        profileId,
        opponentName,
        opponentTeam,
        playerPoints: Number(playerPoints),
        opponentPoints: Number(opponentPoints),
        playedOn,
        notes,
        battles: battles.map((b) => ({
          outcome: b.outcome,
          finish: b.finish,
          playerBeybladeId: b.playerBeybladeId || null,
          opponentBeybladeId: b.opponentBeybladeId || null,
        })),
      };
      const result = match ? await updateLeagueMatch(leagueId, match.id, input) : await createLeagueMatch(leagueId, input);
      setErrors(result.fieldErrors ?? {});
      if (result.status === "error") {
        setStatus({ status: "error", message: result.message });
        return;
      }
      router.push(`/account/team/teams/${teamSlug}/leagues/${leagueId}?tab=matches`);
      router.refresh();
    });
  };

  const pp = Number(playerPoints);
  const op = Number(opponentPoints);
  const preview = playerPoints !== "" && opponentPoints !== "" ? (pp > op ? "Win" : pp < op ? "Loss" : "Tie") : null;

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Player" htmlFor="match-player" error={errors.profileId?.[0]}>
          <NativeSelect id="match-player" value={profileId} onChange={(e) => setProfileId(e.target.value)} disabled={!canPickAnyPlayer} required>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName} (@{p.username})
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="Date played" htmlFor="match-date" error={errors.playedOn?.[0]}>
          <Input id="match-date" type="date" value={playedOn} onChange={(e) => setPlayedOn(e.target.value)} required />
        </FormField>
        <FormField label="Opponent" htmlFor="match-opponent" error={errors.opponentName?.[0]}>
          <Input id="match-opponent" value={opponentName} onChange={(e) => setOpponentName(e.target.value)} placeholder="Opponent's player name" required />
        </FormField>
        <FormField label="Opponent team" htmlFor="match-opponent-team" error={errors.opponentTeam?.[0]} hint="Optional">
          <Input id="match-opponent-team" value={opponentTeam} onChange={(e) => setOpponentTeam(e.target.value)} placeholder="Their team" />
        </FormField>
      </div>

      <div className="rounded-lg border border-outline-variant/25 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <FormField label="Your points" htmlFor="match-pp" error={errors.playerPoints?.[0]} className="w-28">
            <Input
              id="match-pp"
              type="number"
              inputMode="numeric"
              min={0}
              max={99}
              value={playerPoints}
              onChange={(e) => setPlayerPoints(e.target.value)}
              className="text-center text-base font-semibold tabular-nums"
              required
            />
          </FormField>
          <span className="pb-2 text-on-surface/35">–</span>
          <FormField label="Opponent points" htmlFor="match-op" error={errors.opponentPoints?.[0]} className="w-28">
            <Input
              id="match-op"
              type="number"
              inputMode="numeric"
              min={0}
              max={99}
              value={opponentPoints}
              onChange={(e) => setOpponentPoints(e.target.value)}
              className="text-center text-base font-semibold tabular-nums"
              required
            />
          </FormField>
          {preview ? (
            <span
              className={cn(
                "mb-1.5 rounded px-2 py-0.5 text-xs font-medium",
                preview === "Win" && "bg-emerald-500/15 text-emerald-500",
                preview === "Loss" && "bg-primary/10 text-primary",
                preview === "Tie" && "bg-surface-container-high text-on-surface/70"
              )}
            >
              {preview}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-on-surface/45">Scored from the player&apos;s side. More points wins; equal points is a tie.</p>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-[13px] font-medium">
              Battles <span className="font-normal text-on-surface/45">· optional</span>
            </h3>
            <p className="text-xs text-on-surface/45">Record each battle&apos;s result, finish and Beyblades.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addBattle}>
            <Plus /> Add battle
          </Button>
        </div>

        {battles.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-outline-variant/30 px-4 py-3 text-[13px] text-on-surface/45">
            <Swords className="h-4 w-4" aria-hidden="true" /> No battles recorded.
          </div>
        ) : (
          <ol className="space-y-2">
            {battles.map((b, i) => (
              <li key={b.key} className="rounded-lg border border-outline-variant/25 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-on-surface/60">Battle {i + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="erp:h-7 erp:w-7"
                    aria-label={`Remove battle ${i + 1}`}
                    onClick={() => setBattles((list) => list.filter((x) => x.key !== b.key))}
                  >
                    <Trash2 />
                  </Button>
                </div>
                {/* Reads as a sentence: [Your Beyblade] [Win] by [Spin Finish] against [their Beyblade] */}
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_1fr_1.4fr]">
                  <BladeSelect
                    label="Player Beyblade"
                    value={b.playerBeybladeId}
                    blades={blades}
                    onChange={(v) => updateBattle(b.key, { playerBeybladeId: v })}
                  />
                  <NativeSelect
                    aria-label="Result"
                    value={b.outcome}
                    onChange={(e) => updateBattle(b.key, { outcome: e.target.value as BattleOutcome })}
                    className={cn(b.outcome === "win" ? "text-emerald-500" : "text-primary")}
                  >
                    <option value="win">Win</option>
                    <option value="loss">Lost</option>
                  </NativeSelect>
                  <NativeSelect
                    aria-label="Finish"
                    value={b.finish}
                    onChange={(e) => updateBattle(b.key, { finish: e.target.value as FinishType })}
                  >
                    {BATTLE_FINISHES.map((f) => (
                      <option key={f} value={f}>
                        by {BATTLE_FINISH_LABEL[f]} ({BATTLE_FINISH_POINTS[f]} pt{BATTLE_FINISH_POINTS[f] > 1 ? "s" : ""})
                      </option>
                    ))}
                  </NativeSelect>
                  <BladeSelect
                    label="Opponent Beyblade"
                    prefix="vs "
                    value={b.opponentBeybladeId}
                    blades={blades}
                    onChange={(v) => updateBattle(b.key, { opponentBeybladeId: v })}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}

        {battles.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3 text-[13px]">
            <span className="text-on-surface/60">
              Battle totals:{" "}
              <span className="font-medium tabular-nums text-on-surface">
                {battleTotals.player} – {battleTotals.opponent}
              </span>
            </span>
            {totalsDiffer ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPlayerPoints(String(battleTotals.player));
                  setOpponentPoints(String(battleTotals.opponent));
                }}
              >
                Use battle totals as the score
              </Button>
            ) : null}
          </div>
        ) : null}
        {errors.battles?.[0] ? <p className="text-xs text-primary">{errors.battles[0]}</p> : null}
      </section>

      <FormField label="Notes" htmlFor="match-notes" error={errors.notes?.[0]} hint="Optional">
        <Textarea id="match-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
      </FormField>

      <div className="flex items-center gap-3 border-t border-outline-variant/20 pt-4">
        <Button type="submit" disabled={pending || players.length === 0}>
          {pending ? "Saving…" : match ? "Save match" : "Add match"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
        <FormStatus status={status?.status ?? null} message={status?.message} />
      </div>
    </form>
  );
}

function BladeSelect({
  label,
  value,
  blades,
  onChange,
  prefix = "",
}: {
  label: string;
  value: string;
  blades: BeybladeOption[];
  onChange: (value: string) => void;
  prefix?: string;
}) {
  return (
    <NativeSelect aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{prefix}{label} (optional)</option>
      {blades.map((bb) => (
        <option key={bb.id} value={bb.id}>
          {prefix}
          {bb.name}
        </option>
      ))}
    </NativeSelect>
  );
}
