"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { bulkAddBeyblades, type BulkAddedBeyblade } from "@/app/backend/beyblades/actions";

const EXAMPLE =
  "code,name,short_name,type,series,system_line,category,spin_direction\n" +
  "BX-01,Dran Sword,Dran Sword,attack,x_generation,basic_line,blade,right";

export function BulkAddBeybladesDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: (added: BulkAddedBeyblade[]) => void;
}) {
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<{ addedCount: number; failed: { line: number; reason: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setCsv("");
    setResult(null);
    setError(null);
  }

  function handleSubmit() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const outcome = await bulkAddBeyblades(csv);
      if (outcome.added.length === 0 && outcome.failed.length === 0) {
        setError(outcome.message ?? "Something went wrong.");
        return;
      }
      if (outcome.added.length > 0) onAdded(outcome.added);
      setResult({ addedCount: outcome.added.length, failed: outcome.failed });
      if (outcome.failed.length === 0) {
        // Clean sweep — close automatically rather than making the admin
        // dismiss a dialog with nothing left to fix.
        reset();
        onOpenChange(false);
      } else {
        // Partial success — keep the dialog open with the failed lines
        // still in the textarea so they can be fixed and resubmitted
        // without retyping the ones that already made it in.
        setCsv((prev) => {
          const lines = prev.split("\n").map((l) => l.trim()).filter(Boolean);
          const header = lines[0]?.toLowerCase().startsWith("code,") ? [lines[0]] : [];
          const dataLines = header.length ? lines.slice(1) : lines;
          const failedLineNumbers = new Set(outcome.failed.map((f) => f.line));
          const remaining = dataLines.filter((_, i) => failedLineNumbers.has(i + 1));
          return [...header, ...remaining].join("\n");
        });
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Add Beyblades</DialogTitle>
          <DialogDescription>
            One beyblade per line, comma-separated: code, name, short name, type, series, system line, category, spin
            direction. A header row is optional. Stats, description, and the Blade-assembly pickers aren&apos;t set
            here — open each one afterward to fill those in.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 px-6 pb-6">
          <Textarea
            className="min-h-40 font-mono text-xs"
            placeholder={EXAMPLE}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            aria-label="Beyblades CSV"
          />

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {result ? (
            <div className="space-y-1 text-sm">
              {result.addedCount > 0 ? <p className="text-primary">Added {result.addedCount}.</p> : null}
              {result.failed.length > 0 ? (
                <div className="text-destructive">
                  <p>{result.failed.length} row(s) failed — fix and resubmit:</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    {result.failed.map((f) => (
                      <li key={f.line}>
                        Line {f.line}: {f.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <DialogFooter className="p-6 pt-0">
          <Button type="button" tooltip="Add these beyblades" disabled={pending || csv.trim().length === 0} onClick={handleSubmit}>
            {pending ? "Adding..." : "Add Beyblades"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
