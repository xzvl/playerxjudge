"use client";

import { useState } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  MOCK_ORGANIZED_TOURNAMENTS,
  MOCK_ORGANIZER_REGISTRATIONS,
  MOCK_REVENUE,
} from "@/lib/mock/organizer-dashboard";

const ALL = "all";
type Dataset = "participants" | "revenue";

function escapeCsvField(value: string | number | null) {
  const str = value === null ? "" : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function toCsv(headers: string[], rows: (string | number | null)[][]) {
  return [headers, ...rows].map((row) => row.map(escapeCsvField).join(",")).join("\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ExportCsvPanel() {
  const [tournamentId, setTournamentId] = useState(ALL);
  const [dataset, setDataset] = useState<Dataset>("participants");

  const tournament = MOCK_ORGANIZED_TOURNAMENTS.find((t) => t.id === tournamentId) ?? null;

  function handleExport() {
    if (dataset === "participants") {
      const rows = MOCK_ORGANIZER_REGISTRATIONS.filter((r) => tournamentId === ALL || r.tournamentId === tournamentId).map(
        (r) => {
          const t = MOCK_ORGANIZED_TOURNAMENTS.find((t) => t.id === r.tournamentId);
          return [r.playerName, r.teamName, t?.title ?? "", r.seed, r.status, r.registeredAt, r.checkedInAt];
        }
      );
      const csv = toCsv(
        ["Player", "Team", "Tournament", "Seed", "Status", "Registered At", "Checked In At"],
        rows
      );
      downloadCsv(`participants-${tournament?.slug ?? "all"}.csv`, csv);
    } else {
      const rows = MOCK_REVENUE.filter((r) => !tournament || r.tournamentTitle === tournament.title).map((r) => [
        r.tournamentTitle,
        r.amount,
        r.method,
        r.status,
        r.paidAt,
      ]);
      const csv = toCsv(["Tournament", "Amount", "Method", "Status", "Paid At"], rows);
      downloadCsv(`revenue-${tournament?.slug ?? "all"}.csv`, csv);
    }
  }

  return (
    <div className="max-w-lg border border-outline-variant/25 bg-surface-container-low p-6">
      <div className="space-y-4">
        <Combobox
          label="Tournament"
          value={tournamentId}
          onValueChange={setTournamentId}
          options={[
            { value: ALL, label: "All Tournaments" },
            ...MOCK_ORGANIZED_TOURNAMENTS.map((t) => ({ value: t.id, label: t.title })),
          ]}
        />
        <Combobox
          label="Dataset"
          value={dataset}
          onValueChange={(v) => setDataset(v as Dataset)}
          options={[
            { value: "participants", label: "Participants" },
            { value: "revenue", label: "Revenue" },
          ]}
        />
      </div>
      <Button className="mt-6 w-full gap-1.5" tooltip="Download the selected data as a CSV file" onClick={handleExport}>
        <Download className="h-4 w-4" /> Download CSV
      </Button>
    </div>
  );
}
