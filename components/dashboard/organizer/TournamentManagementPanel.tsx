"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TournamentStatusBadge } from "@/components/dashboard/organizer/badges";
import { archiveTournament } from "@/app/account/organizer/dashboard/actions";
import { formatDate } from "@/lib/format";
import { STAGE_FORMAT_OPTIONS, GRAND_FINALS_OPTIONS } from "@/lib/validations/tournament-wizard";
import type { Tournament } from "@/lib/types/database";

type TabKey = "all" | "pending" | "in_progress" | "complete" | "archive";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In Progress" },
  { key: "complete", label: "Complete" },
  { key: "archive", label: "Archive" },
];

const PENDING_STATUSES = new Set(["draft", "published", "registration_open", "registration_closed"]);

function formatLabel(format: string) {
  return STAGE_FORMAT_OPTIONS.find((o) => o.value === format)?.label ?? format;
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
  const [tab, setTab] = useState<TabKey>("all");
  const [isPending, startTransition] = useTransition();

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

  function toggleArchive(t: Tournament) {
    startTransition(() => {
      archiveTournament(t.id, !t.is_archived);
    });
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

      {visible.length > 0 ? (
        <div className="overflow-x-auto border border-outline-variant/25">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="label-mono border-b border-outline-variant/25 text-on-surface/40">
                <th className="p-4" scope="col">Title</th>
                <th className="p-4" scope="col">Status</th>
                <th className="p-4" scope="col">Format</th>
                <th className="p-4" scope="col">Start</th>
                <th className="p-4" scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <tr key={t.id} className="border-b border-outline-variant/15 last:border-0 hover:bg-white/[0.02]">
                  <td className="p-4 font-medium text-on-surface">
                    <Link href={`/account/organizer/tournament/${t.slug}`} className="hover:text-primary hover:underline">
                      {t.title}
                    </Link>
                  </td>
                  <td className="p-4">
                    <TournamentStatusBadge status={t.status} />
                  </td>
                  <td className="p-4 text-on-surface/60">{summarizeFormatSettings(t)}</td>
                  <td className="p-4 text-on-surface/60">{formatDate(t.starts_at)}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" asChild tooltip="Open the tournament management workspace">
                        <Link href={`/account/organizer/tournament/${t.slug}`}>Manage</Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        tooltip={t.is_archived ? "Restore this tournament from the archive" : "Move this tournament to the archive"}
                        disabled={isPending}
                        onClick={() => toggleArchive(t)}
                        className="gap-1.5"
                      >
                        {t.is_archived ? (
                          <>
                            <ArchiveRestore className="h-3.5 w-3.5" /> Unarchive
                          </>
                        ) : (
                          <>
                            <Archive className="h-3.5 w-3.5" /> Archive
                          </>
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
          {tab === "all" ? "You haven't created any tournaments yet." : `No tournaments in "${TABS.find((tb) => tb.key === tab)?.label}".`}
        </p>
      )}
    </div>
  );
}
