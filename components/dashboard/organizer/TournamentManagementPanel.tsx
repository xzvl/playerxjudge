"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, Archive, ArchiveRestore, Copy, LayoutDashboard, Plus, Send, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TournamentStatusBadge } from "@/components/dashboard/organizer/badges";
import { archiveTournament, duplicateTournament, setTournamentPublished } from "@/app/account/organizer/dashboard/actions";
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { STAGE_FORMAT_OPTIONS, GRAND_FINALS_OPTIONS } from "@/lib/validations/tournament-wizard";
import type { Tournament, TournamentStatus } from "@/lib/types/database";

type TabKey = "all" | "pending" | "in_progress" | "complete" | "archive";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In Progress" },
  { key: "complete", label: "Complete" },
  { key: "archive", label: "Archive" },
];

const PENDING_STATUSES = new Set(["draft", "published", "registration_open", "registration_closed"]);

type SortKey = "title" | "status" | "format" | "start";
type SortDir = "asc" | "desc";

// Lifecycle order rather than alphabetical — sorting by Status should read
// as "how far along is this tournament", not A-Z.
const STATUS_SORT_ORDER: Record<TournamentStatus, number> = {
  draft: 0,
  published: 1,
  registration_open: 2,
  registration_closed: 3,
  ongoing: 4,
  completed: 5,
  cancelled: 6,
};

function formatLabel(format: string) {
  return STAGE_FORMAT_OPTIONS.find((o) => o.value === format)?.label ?? format;
}

function SortableHeader({
  label,
  active,
  dir,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  className?: string;
}) {
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={cn("p-4", className)} scope="col" aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "label-mono flex items-center gap-1.5 transition-colors hover:text-on-surface",
          active ? "text-primary" : "text-on-surface/40"
        )}
      >
        {label}
        <Icon className="h-3 w-3" aria-hidden="true" />
      </button>
    </th>
  );
}

function summarizeFormatSettings(tournament: Tournament) {
  const settings = tournament.format_settings;
  if (!settings || !settings.stageType) return formatLabel(tournament.bracket_format);

  if (settings.stageType === "single_stage") {
    return `Single Stage — ${formatLabel(settings.singleStageFormat)}`;
  }

  const groupLabel = `${formatLabel(settings.groupStage.format)} groups (${settings.groupStage.participantsPerGroup} per group, top ${settings.groupStage.participantsAdvancePerGroup} advance)`;
  let finalLabel = formatLabel(settings.finalStage.format);
  if (settings.finalStage.format === "double_elimination") {
    const modifier = GRAND_FINALS_OPTIONS.find((o) => o.value === settings.finalStage.grandFinalsModifier)?.label;
    finalLabel += ` (Grand Finals: ${modifier})`;
  }
  return `Two Stage — ${groupLabel} → ${finalLabel} final`;
}

export function TournamentManagementPanel({ tournaments }: { tournaments: Tournament[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("all");
  const [isPending, startTransition] = useTransition();
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  // Defaults to the tournament's start date, latest first — see
  // toggleSort/SortableHeader below for the rest of the sortable-header
  // behavior.
  const [sortKey, setSortKey] = useState<SortKey>("start");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const buckets = useMemo(() => {
    const nonArchived = tournaments.filter((t) => !t.is_archived);
    return {
      all: nonArchived,
      pending: nonArchived.filter((t) => PENDING_STATUSES.has(t.status)),
      in_progress: nonArchived.filter((t) => t.status === "ongoing"),
      complete: nonArchived.filter((t) => t.status === "completed"),
      archive: tournaments.filter((t) => t.is_archived),
    } satisfies Record<TabKey, Tournament[]>;
  }, [tournaments]);

  const visible = buckets[tab];

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...visible].sort((a, b) => {
      switch (sortKey) {
        case "title":
          return a.title.localeCompare(b.title) * dir;
        case "status":
          return (STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status]) * dir;
        case "format":
          return summarizeFormatSettings(a).localeCompare(summarizeFormatSettings(b)) * dir;
        case "start":
          return (new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()) * dir;
      }
    });
  }, [visible, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function toggleArchive(t: Tournament) {
    startTransition(() => {
      archiveTournament(t.id, !t.is_archived);
    });
  }

  function togglePublished(t: Tournament) {
    startTransition(() => {
      setTournamentPublished(t.id, t.status === "draft");
    });
  }

  // Duplicates run outside the archive/unarchive transition (their own
  // pending flag, keyed by tournament id) since they navigate away on
  // success rather than just refreshing this list in place.
  function duplicate(t: Tournament) {
    setDuplicateError(null);
    setDuplicatingId(t.id);
    (async () => {
      const result = await duplicateTournament(t.id);
      setDuplicatingId(null);
      if (result.status === "error") {
        setDuplicateError(result.message);
        return;
      }
      router.push(`/account/organizer/tournament/${result.slug}`);
    })();
  }

  // Shared between the mobile card list and the desktop table's action
  // column — same buttons either way.
  function rowActions(t: Tournament) {
    return (
      <>
        <Button variant="outline" size="icon" asChild tooltip="Open the tournament management workspace">
          <Link href={`/account/organizer/tournament/${t.slug}`} aria-label="Manage">
            <LayoutDashboard className="h-3.5 w-3.5" />
          </Link>
        </Button>
        <Button
          variant="outline"
          size="icon"
          tooltip="Duplicate this tournament's setup into a new draft"
          aria-label="Duplicate"
          disabled={duplicatingId === t.id}
          onClick={() => duplicate(t)}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        {t.status === "draft" || t.status === "published" ? (
          <Button
            variant="outline"
            size="icon"
            tooltip={t.status === "draft" ? "Publish this tournament" : "Move this tournament back to draft"}
            aria-label={t.status === "draft" ? "Publish" : "Unpublish"}
            disabled={isPending}
            onClick={() => togglePublished(t)}
          >
            {t.status === "draft" ? <Send className="h-3.5 w-3.5" /> : <Undo2 className="h-3.5 w-3.5" />}
          </Button>
        ) : null}
        <Button
          variant="outline"
          size="icon"
          tooltip={t.is_archived ? "Restore this tournament from the archive" : "Move this tournament to the archive"}
          aria-label={t.is_archived ? "Unarchive" : "Archive"}
          disabled={isPending}
          onClick={() => toggleArchive(t)}
        >
          {t.is_archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
        </Button>
      </>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList>
            {TABS.map(({ key, label }) => (
              <TabsTrigger key={key} value={key}>
                {label} ({buckets[key].length})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button asChild size="sm" className="gap-1.5" tooltip="Set up a new tournament">
          <Link href="/account/organizer/tournament/new">
            <Plus className="h-3.5 w-3.5" /> Create Tournament
          </Link>
        </Button>
      </div>

      {duplicateError ? (
        <p role="alert" className="mb-4 border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {duplicateError}
        </p>
      ) : null}

      {visible.length > 0 ? (
        <>
          {/* Below lg: one row per tournament. */}
          <div className="flex flex-col gap-3 lg:hidden">
            {sorted.map((t) => (
              <article key={t.id} className="border border-outline-variant/25 bg-surface-container-low p-4">
                <Link href={`/account/organizer/tournament/${t.slug}`} className="font-medium text-on-surface hover:text-primary hover:underline">
                  {t.title}
                </Link>
                <p className="mt-1 truncate text-sm text-on-surface/60" title={summarizeFormatSettings(t)}>
                  {summarizeFormatSettings(t)}
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-on-surface/60">
                  <span>
                    Date and Time: {formatDate(t.starts_at)} &middot; {formatTime(t.starts_at)}
                  </span>
                  <TournamentStatusBadge status={t.status} />
                </div>
                <div className="mt-3 flex gap-2">{rowActions(t)}</div>
              </article>
            ))}
          </div>

          {/* lg and up: the full table. */}
          <div className="hidden overflow-x-auto border border-outline-variant/25 lg:block">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="label-mono border-b border-outline-variant/25 text-on-surface/40">
                  <SortableHeader label="Title" active={sortKey === "title"} dir={sortDir} onClick={() => toggleSort("title")} />
                  <SortableHeader label="Status" active={sortKey === "status"} dir={sortDir} onClick={() => toggleSort("status")} />
                  <SortableHeader
                    label="Format"
                    active={sortKey === "format"}
                    dir={sortDir}
                    onClick={() => toggleSort("format")}
                    className="w-[180px]"
                  />
                  <SortableHeader label="Start" active={sortKey === "start"} dir={sortDir} onClick={() => toggleSort("start")} />
                  <th className="p-4" scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((t) => (
                  <tr key={t.id} className="border-b border-outline-variant/15 last:border-0 hover:bg-white/[0.02]">
                    <td className="p-4 font-medium text-on-surface">
                      <Link href={`/account/organizer/tournament/${t.slug}`} className="hover:text-primary hover:underline">
                        {t.title}
                      </Link>
                    </td>
                    <td className="p-4">
                      <TournamentStatusBadge status={t.status} />
                    </td>
                    <td className="p-4 text-on-surface/60">
                      <div className="max-w-[180px] truncate" title={summarizeFormatSettings(t)}>
                        {summarizeFormatSettings(t)}
                      </div>
                    </td>
                    <td className="p-4 text-on-surface/60">{formatDate(t.starts_at)}</td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">{rowActions(t)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
          {tab === "all" ? "You haven't created any tournaments yet." : `No tournaments in "${TABS.find((tb) => tb.key === tab)?.label}".`}
        </p>
      )}
    </div>
  );
}
