"use client";

import { Radio } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Shown once, automatically, whenever whoever opened the console (organizer
// or confirmed judge) hasn't claimed a stadium yet — same list the header's
// Stadium field offers, just impossible to miss on arrival. Picking one here
// is exactly the header field's onSelect; this is only a bigger, harder-to-
// ignore entry point into the same choice, not a separate flow.
export function JudgeStadiumPromptDialog({
  open,
  onOpenChange,
  stations,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stations: { id: string; name: string }[];
  onSelect: (stationId: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Your Stadium</DialogTitle>
          <DialogDescription>Pick which stadium/table you&apos;re judging at before you start scoring.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 px-6 pb-6">
          {stations.map((station) => (
            <button
              key={station.id}
              type="button"
              onClick={() => onSelect(station.id)}
              className="flex w-full items-center gap-2 border border-outline-variant/30 px-4 py-3 text-left text-sm text-on-surface transition-colors hover:border-primary hover:text-primary"
            >
              <Radio className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              {station.name}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
