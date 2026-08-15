"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

// [<] current / last [>] — shared by every paginated organizer table (Log,
// Participants, Community Members). Renders nothing for a single page, so
// callers can drop it in unconditionally at both the top and bottom of a
// list.
export function Pagination({
  page,
  lastPage,
  onChange,
}: {
  page: number;
  lastPage: number;
  onChange: (page: number) => void;
}) {
  if (lastPage <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Previous page"
        tooltip="Previous page"
        disabled={page === 1}
        onClick={() => onChange(Math.max(1, page - 1))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <p className="label-mono text-on-surface/60">
        {page} / {lastPage}
      </p>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Next page"
        tooltip="Next page"
        disabled={page === lastPage}
        onClick={() => onChange(Math.min(lastPage, page + 1))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
