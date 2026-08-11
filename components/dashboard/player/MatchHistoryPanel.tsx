"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { formatDate, formatTime } from "@/lib/format";
import { FINISH_TYPE_LABELS, MOCK_MATCHES, type FinishType } from "@/lib/mock/player-dashboard";

const ALL = "all";

export function MatchHistoryPanel() {
  const [result, setResult] = useState<string>(ALL);
  const [finishType, setFinishType] = useState<string>(ALL);

  const filtered = useMemo(
    () =>
      MOCK_MATCHES.filter((m) => {
        if (result !== ALL && m.result !== result) return false;
        if (finishType !== ALL && m.finishType !== finishType) return false;
        return true;
      }).sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()),
    [result, finishType]
  );

  return (
    <div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 sm:max-w-md">
        <Combobox
          label="Result"
          value={result}
          onValueChange={setResult}
          options={[
            { value: ALL, label: "All Results" },
            { value: "won", label: "Won" },
            { value: "lost", label: "Lost" },
          ]}
        />
        <Combobox
          label="Finish Type"
          value={finishType}
          onValueChange={setFinishType}
          options={[
            { value: ALL, label: "All Finish Types" },
            ...(Object.keys(FINISH_TYPE_LABELS) as FinishType[]).map((ft) => ({
              value: ft,
              label: FINISH_TYPE_LABELS[ft],
            })),
          ]}
        />
      </div>

      {filtered.length > 0 ? (
        <div className="overflow-x-auto border border-outline-variant/25">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="label-mono border-b border-outline-variant/25 text-on-surface/40">
                <th className="p-4" scope="col">Tournament</th>
                <th className="p-4" scope="col">Opponent</th>
                <th className="p-4" scope="col">Round</th>
                <th className="p-4" scope="col">Result</th>
                <th className="p-4" scope="col">Finish</th>
                <th className="p-4" scope="col">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-b border-outline-variant/15 last:border-0 hover:bg-white/[0.02]">
                  <td className="p-4 font-medium text-on-surface">{m.tournamentTitle}</td>
                  <td className="p-4 text-on-surface/60">{m.opponent}</td>
                  <td className="p-4 text-on-surface/60">{m.round}</td>
                  <td className="p-4">
                    <Badge variant={m.result === "won" ? "success" : "destructive"}>{m.result}</Badge>
                  </td>
                  <td className="p-4 text-on-surface/60">{FINISH_TYPE_LABELS[m.finishType]}</td>
                  <td className="p-4 text-on-surface/60">
                    {formatDate(m.playedAt)} &middot; {formatTime(m.playedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
          No matches match your filters.
        </p>
      )}
    </div>
  );
}
