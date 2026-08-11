"use client";

import { useState, useTransition } from "react";
import { Megaphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatTime } from "@/lib/format";
import { postAnnouncement } from "@/app/account/organizer/tournament/[slug]/workspace-panels-actions";

export interface AnnouncementItem {
  id: string;
  author: string;
  message: string;
  postedAt: string;
}

export function TournamentAnnouncementsPanel({
  tournamentId,
  slug,
  announcements,
}: {
  tournamentId: string;
  slug: string;
  announcements: AnnouncementItem[];
}) {
  const [items, setItems] = useState(announcements);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function post() {
    const message = draft.trim();
    if (!message) return;
    setError(null);
    startTransition(async () => {
      const result = await postAnnouncement(tournamentId, slug, message);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      if (result.announcement) {
        setItems((prev) => [
          { id: result.announcement!.id, author: "You", message: result.announcement!.message, postedAt: result.announcement!.created_at },
          ...prev,
        ]);
      }
      setDraft("");
    });
  }

  return (
    <div>
      <div className="mb-6 space-y-3 border border-outline-variant/25 bg-surface-container-low p-4">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Post an update to everyone registered for this tournament..."
          rows={3}
        />
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end">
          <Button size="sm" tooltip="Post this update to everyone registered" onClick={post} disabled={!draft.trim() || pending}>
            {pending ? "Posting..." : "Post Announcement"}
          </Button>
        </div>
      </div>

      {items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((a) => (
            <li key={a.id} className="flex items-start gap-4 border border-outline-variant/25 bg-surface-container-low p-4">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border border-outline-variant/40 text-primary">
                <Megaphone className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-on-surface">{a.message}</p>
                <p className="label-mono mt-2 text-on-surface/30">
                  {a.author} &middot; {formatDate(a.postedAt)} {formatTime(a.postedAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
          No announcements posted yet.
        </p>
      )}
    </div>
  );
}
