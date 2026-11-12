"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowDownToLine, ArrowUp, ArrowUpToLine, GripVertical, Sparkles, Trash2, UserPlus, Users } from "lucide-react";

import { addToLeagueRoster, generateLeagueElite, removeFromLeagueRoster, saveRosterOrder } from "@/app/account/team/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmActionButton } from "@/components/dashboard/team/ConfirmActionButton";
import { PlayerCell } from "@/components/dashboard/team/team-ui";
import { EmptyState } from "@/components/dashboard/erp";
import type { ProfileSummary } from "@/lib/teams/queries";
import { cn } from "@/lib/utils";

export interface RosterPlayerStats {
  rank: number;
  record: string; // "W-L-T"
  score: number;
  played: number;
}

type Zone = "elite" | "sub";
interface DragSource {
  zone: Zone;
  index: number;
}

export function RosterBoard({
  leagueId,
  eliteCount,
  initialElite,
  initialSubs,
  available,
  stats,
  canManage,
}: {
  leagueId: string;
  eliteCount: number;
  initialElite: ProfileSummary[];
  initialSubs: ProfileSummary[];
  // Team members not on this league's roster yet.
  available: ProfileSummary[];
  stats: Record<string, RosterPlayerStats>;
  canManage: boolean;
}) {
  const router = useRouter();
  const [elite, setElite] = useState(initialElite);
  const [subs, setSubs] = useState(initialSubs);
  const [drag, setDrag] = useState<DragSource | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  // Server data wins after a refresh (e.g. after Generate or Add).
  useEffect(() => setElite(initialElite), [initialElite]);
  useEffect(() => setSubs(initialSubs), [initialSubs]);

  const commit = (nextElite: ProfileSummary[], nextSubs: ProfileSummary[]) => {
    const prevElite = elite;
    const prevSubs = subs;
    setElite(nextElite);
    setSubs(nextSubs);
    setError(null);
    startSaving(async () => {
      const result = await saveRosterOrder(
        leagueId,
        nextElite.map((p) => p.id),
        nextSubs.map((p) => p.id)
      );
      if (result.status === "error") {
        setElite(prevElite);
        setSubs(prevSubs);
        setError(result.message ?? "Couldn't save the lineup.");
      } else {
        router.refresh();
      }
    });
  };

  // ---- moves (shared by drag-and-drop and the buttons) ----
  const reorder = (list: ProfileSummary[], from: number, to: number) => {
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  };

  const moveWithin = (zone: Zone, from: number, to: number) => {
    if (from === to) return;
    if (zone === "elite") commit(reorder(elite, from, to), subs);
    else commit(elite, reorder(subs, from, to));
  };

  const swap = (eliteIndex: number, subIndex: number) => {
    const nextElite = [...elite];
    const nextSubs = [...subs];
    [nextElite[eliteIndex], nextSubs[subIndex]] = [nextSubs[subIndex], nextElite[eliteIndex]];
    commit(nextElite, nextSubs);
  };

  const promote = (subIndex: number, eliteIndex?: number) => {
    if (elite.length < eliteCount) {
      const nextSubs = [...subs];
      const [item] = nextSubs.splice(subIndex, 1);
      const nextElite = [...elite];
      nextElite.splice(eliteIndex ?? nextElite.length, 0, item);
      commit(nextElite, nextSubs);
    } else {
      // Full: trade places with the last elite (or the one dropped on).
      swap(eliteIndex ?? elite.length - 1, subIndex);
    }
  };

  const demote = (eliteIndex: number, subIndex = 0) => {
    const nextElite = [...elite];
    const [item] = nextElite.splice(eliteIndex, 1);
    const nextSubs = [...subs];
    nextSubs.splice(subIndex, 0, item);
    commit(nextElite, nextSubs);
  };

  const dropOn = (zone: Zone, index: number) => {
    const source = drag;
    setDrag(null);
    setOver(null);
    if (!source) return;
    if (source.zone === zone) {
      // Dropping into the empty tail of a zone means "move to the end".
      const max = (zone === "elite" ? elite.length : subs.length) - 1;
      moveWithin(zone, source.index, Math.min(index, max));
    } else if (source.zone === "sub" && zone === "elite") {
      if (index >= elite.length) promote(source.index);
      else swap(index, source.index);
    } else if (source.zone === "elite" && zone === "sub") {
      if (index >= subs.length) demote(source.index, subs.length);
      else swap(source.index, index);
    }
  };

  const rowHandlers = (zone: Zone, index: number) =>
    canManage
      ? {
          draggable: true,
          onDragStart: (e: React.DragEvent) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", `${zone}:${index}`);
            setDrag({ zone, index });
          },
          onDragEnd: () => {
            setDrag(null);
            setOver(null);
          },
          onDragOver: (e: React.DragEvent) => {
            if (!drag) return;
            e.preventDefault();
            setOver(`${zone}:${index}`);
          },
          onDragLeave: () => setOver((cur) => (cur === `${zone}:${index}` ? null : cur)),
          onDrop: (e: React.DragEvent) => {
            e.preventDefault();
            dropOn(zone, index);
          },
        }
      : {};

  const emptySlots = Math.max(0, eliteCount - elite.length);
  const total = elite.length + subs.length;

  if (total === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No players on this roster yet"
        description={canManage ? "Add team members to the league to build the lineup." : "The captain hasn't set the roster yet."}
        action={canManage ? <AddPlayersButton leagueId={leagueId} available={available} /> : undefined}
      />
    );
  }

  return (
    <div className="space-y-4">
      {canManage ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] text-on-surface/55">
            Drag players to reorder the bench or swap them into the lineup. Changes save automatically.
            {saving ? <span className="ml-2 text-on-surface/40">Saving…</span> : null}
          </p>
          <div className="flex flex-wrap gap-2">
            <AddPlayersButton leagueId={leagueId} available={available} />
            <ConfirmActionButton
              title="Generate the elite lineup?"
              description={`The top ${eliteCount} players in the current standings become elite, in rank order. Everyone else becomes a sub, also in rank order. Ties keep today's order.`}
              confirmLabel="Generate"
              destructive={false}
              onConfirm={() => generateLeagueElite(leagueId)}
              onDone={() => router.refresh()}
            >
              <Sparkles /> Generate elite
            </ConfirmActionButton>
          </div>
        </div>
      ) : null}
      {error ? <p className="text-[13px] text-primary">{error}</p> : null}

      <section aria-labelledby="elite-heading" className="rounded-lg border border-outline-variant/25">
        <header className="flex items-center justify-between border-b border-outline-variant/20 px-3 py-2">
          <h3 id="elite-heading" className="text-[13px] font-medium">
            Elite <span className="font-normal text-on-surface/45">· main players</span>
          </h3>
          <span className="text-xs tabular-nums text-on-surface/45">
            {elite.length}/{eliteCount}
          </span>
        </header>
        <ol>
          {elite.map((p, i) => (
            <RosterRow
              key={p.id}
              index={i}
              profile={p}
              stats={stats[p.id]}
              zone="elite"
              isDragging={drag?.zone === "elite" && drag.index === i}
              isOver={over === `elite:${i}`}
              canManage={canManage}
              handlers={rowHandlers("elite", i)}
              actions={
                <>
                  <IconAction label="Move up" disabled={i === 0} onClick={() => moveWithin("elite", i, i - 1)} icon={ArrowUp} />
                  <IconAction label="Move down" disabled={i === elite.length - 1} onClick={() => moveWithin("elite", i, i + 1)} icon={ArrowDown} />
                  <IconAction label="Move to subs" onClick={() => demote(i)} icon={ArrowDownToLine} />
                  <RemoveAction leagueId={leagueId} profile={p} />
                </>
              }
            />
          ))}
          {Array.from({ length: emptySlots }).map((_, k) => {
            const index = elite.length + k;
            const isOver = over === `elite:${index}`;
            return (
              <li
                key={`empty-${index}`}
                onDragOver={(e) => {
                  if (!drag || drag.zone !== "sub") return;
                  e.preventDefault();
                  setOver(`elite:${index}`);
                }}
                onDragLeave={() => setOver((cur) => (cur === `elite:${index}` ? null : cur))}
                onDrop={(e) => {
                  e.preventDefault();
                  dropOn("elite", index);
                }}
                className={cn(
                  "flex h-11 items-center gap-3 border-b border-outline-variant/15 px-3 text-[13px] text-on-surface/35 last:border-0",
                  isOver && "bg-primary/5 text-on-surface/60"
                )}
              >
                <span className="w-5 text-right text-xs tabular-nums">{index + 1}</span>
                <span className="flex-1 rounded border border-dashed border-outline-variant/30 px-2 py-1">Open elite slot</span>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="subs-heading" className="rounded-lg border border-outline-variant/25">
        <header className="flex items-center justify-between border-b border-outline-variant/20 px-3 py-2">
          <h3 id="subs-heading" className="text-[13px] font-medium">
            Subs <span className="font-normal text-on-surface/45">· bench order</span>
          </h3>
          <span className="text-xs tabular-nums text-on-surface/45">{subs.length}</span>
        </header>
        <ol>
          {subs.map((p, i) => (
            <RosterRow
              key={p.id}
              index={i}
              profile={p}
              stats={stats[p.id]}
              zone="sub"
              isDragging={drag?.zone === "sub" && drag.index === i}
              isOver={over === `sub:${i}`}
              canManage={canManage}
              handlers={rowHandlers("sub", i)}
              actions={
                <>
                  <IconAction label="Move up" disabled={i === 0} onClick={() => moveWithin("sub", i, i - 1)} icon={ArrowUp} />
                  <IconAction label="Move down" disabled={i === subs.length - 1} onClick={() => moveWithin("sub", i, i + 1)} icon={ArrowDown} />
                  <IconAction
                    label={elite.length < eliteCount ? "Promote to elite" : "Swap with last elite"}
                    onClick={() => promote(i)}
                    icon={ArrowUpToLine}
                  />
                  <RemoveAction leagueId={leagueId} profile={p} />
                </>
              }
            />
          ))}
          {/* Drop zone at the end of the bench (also catches demotions). */}
          {canManage ? (
            <li
              onDragOver={(e) => {
                if (!drag) return;
                e.preventDefault();
                setOver(`sub:${subs.length}`);
              }}
              onDragLeave={() => setOver((cur) => (cur === `sub:${subs.length}` ? null : cur))}
              onDrop={(e) => {
                e.preventDefault();
                dropOn("sub", subs.length);
              }}
              className={cn(
                "flex h-9 items-center justify-center text-xs text-on-surface/35 transition-colors",
                drag ? "visible" : "invisible h-0",
                over === `sub:${subs.length}` && "bg-primary/5 text-on-surface/60"
              )}
            >
              Drop here to move to the end of the bench
            </li>
          ) : null}
          {subs.length === 0 && !drag ? <li className="px-3 py-3 text-[13px] text-on-surface/45">No subs.</li> : null}
        </ol>
      </section>
    </div>
  );
}

function RosterRow({
  index,
  profile,
  stats,
  zone,
  isDragging,
  isOver,
  canManage,
  handlers,
  actions,
}: {
  index: number;
  profile: ProfileSummary;
  stats?: RosterPlayerStats;
  zone: Zone;
  isDragging: boolean;
  isOver: boolean;
  canManage: boolean;
  handlers: Record<string, unknown>;
  actions: React.ReactNode;
}) {
  return (
    <li
      {...handlers}
      className={cn(
        "group flex min-h-11 items-center gap-3 border-b border-outline-variant/15 px-3 py-1.5 last:border-0 transition-colors",
        canManage && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
        isOver && "bg-primary/5 shadow-[inset_0_2px_0_0_rgb(var(--m3-primary))]"
      )}
    >
      {canManage ? <GripVertical className="h-3.5 w-3.5 shrink-0 text-on-surface/25" aria-hidden="true" /> : null}
      <span className={cn("w-5 shrink-0 text-right text-xs tabular-nums", zone === "elite" ? "font-semibold text-on-surface" : "text-on-surface/45")}>
        {zone === "elite" ? index + 1 : `S${index + 1}`}
      </span>
      <div className="min-w-0 flex-1">
        <PlayerCell profile={profile} />
      </div>
      {stats ? (
        <div className="hidden shrink-0 items-center gap-4 text-xs tabular-nums text-on-surface/60 sm:flex">
          <span title="Standings rank">#{stats.rank}</span>
          <span title="Wins-Losses-Ties" className="w-14 text-right">
            {stats.record}
          </span>
          <span title="Score" className="w-10 text-right font-medium text-on-surface">
            {stats.score} pts
          </span>
        </div>
      ) : null}
      {canManage ? <div className="flex shrink-0 items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100 focus-within:opacity-100">{actions}</div> : null}
    </li>
  );
}

function IconAction({
  label,
  icon: Icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button type="button" variant="ghost" size="icon" className="erp:h-7 erp:w-7" aria-label={label} onClick={onClick} disabled={disabled}>
      <Icon />
    </Button>
  );
}

function RemoveAction({ leagueId, profile }: { leagueId: string; profile: ProfileSummary }) {
  const router = useRouter();
  return (
    <ConfirmActionButton
      title={`Remove ${profile.displayName} from this league?`}
      description="They stay on the team. Their logged matches stay in the league history."
      confirmLabel="Remove"
      variant="ghost"
      size="icon"
      className="erp:h-7 erp:w-7"
      aria-label={`Remove ${profile.displayName} from roster`}
      onConfirm={() => removeFromLeagueRoster(leagueId, profile.id)}
      onDone={() => router.refresh()}
    >
      <Trash2 />
    </ConfirmActionButton>
  );
}

function AddPlayersButton({ leagueId, available }: { leagueId: string; available: ProfileSummary[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const sorted = useMemo(() => [...available].sort((a, b) => a.displayName.localeCompare(b.displayName)), [available]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <UserPlus /> Add players
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setSelected(new Set());
            setError(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add players to the roster</DialogTitle>
            <DialogDescription>New players fill open elite slots first, then join the end of the bench.</DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto px-5">
            {sorted.length === 0 ? (
              <p className="py-4 text-[13px] text-on-surface/50">Every team member is already on this roster. Invite more players from the Members tab.</p>
            ) : (
              <ul className="divide-y divide-outline-variant/15">
                {sorted.map((p) => (
                  <li key={p.id}>
                    <label className="flex cursor-pointer items-center gap-3 py-2">
                      <Checkbox checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                      <PlayerCell profile={p} />
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {error ? <p className="px-5 text-[13px] text-primary">{error}</p> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              disabled={pending || selected.size === 0}
              onClick={() =>
                startTransition(async () => {
                  const result = await addToLeagueRoster(leagueId, [...selected]);
                  if (result.status === "error") return setError(result.message ?? "Couldn't add them.");
                  setOpen(false);
                  setSelected(new Set());
                  router.refresh();
                })
              }
            >
              {pending ? "Adding…" : `Add ${selected.size || ""}`.trim()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
