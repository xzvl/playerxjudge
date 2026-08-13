"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bell, Check, Gavel, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatTime } from "@/lib/format";
import { deleteNotification, respondToJudgeInvite, setNotificationRead } from "@/app/account/notifications-actions";
import type { NotificationRow } from "@/lib/types/database";

const TYPE_ICONS: Record<string, typeof Bell> = {
  judge_invite: Gavel,
  judge_response: Gavel,
};

// A judge-invite notification's link carries the `judges` row id it's
// about (see inviteJudge in the organizer's judges-actions.ts) — pulled out
// here to power the Accept/Decline buttons below.
function respondJudgeRowId(notification: NotificationRow): string | null {
  if (notification.type !== "judge_invite" || !notification.link) return null;
  try {
    return new URL(notification.link, "http://localhost").searchParams.get("respond");
  } catch {
    return null;
  }
}

export function NotificationsPanel({ notifications: initial }: { notifications: NotificationRow[] }) {
  const [notifications, setNotifications] = useState(initial);
  const [view, setView] = useState<"unread" | "read">("unread");
  const [respondedIds, setRespondedIds] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  function markRead(id: string, isRead: boolean) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: isRead } : n)));
    startTransition(() => {
      void setNotificationRead(id, isRead);
    });
  }

  function remove(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    startTransition(() => {
      void deleteNotification(id);
    });
  }

  function respond(notification: NotificationRow, judgeRowId: string, decision: "approved" | "removed") {
    // Hides the Accept/Decline buttons immediately; the follow-up state
    // update (once the server responds with the real link/title) is what
    // makes that persist past this session — see respondToJudgeInvite.
    setRespondedIds((prev) => new Set(prev).add(notification.id));
    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)));
    startTransition(async () => {
      const result = await respondToJudgeInvite(judgeRowId, notification.id, decision);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, link: result.link ?? null, title: result.title ?? n.title } : n))
      );
    });
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const visible = notifications.filter((n) => (view === "unread" ? !n.is_read : n.is_read));

  return (
    <div>
      <Tabs value={view} onValueChange={(v) => setView(v as "unread" | "read")} className="mb-6">
        <TabsList>
          <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
          <TabsTrigger value="read">Read</TabsTrigger>
        </TabsList>
      </Tabs>

      {visible.length > 0 ? (
        <ul className="space-y-3">
          {visible.map((n) => {
            const Icon = TYPE_ICONS[n.type] ?? Bell;
            const judgeRowId = respondJudgeRowId(n);
            const awaitingResponse = judgeRowId !== null && !respondedIds.has(n.id);
            return (
              <li key={n.id} className="flex items-start gap-4 border border-outline-variant/25 bg-surface-container-low p-4">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border border-outline-variant/40 text-primary">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-on-surface">{n.title}</p>
                  {n.body ? <p className="mt-1 text-sm text-on-surface/60">{n.body}</p> : null}
                  <p className="label-mono mt-2 text-on-surface/30">
                    {formatDate(n.created_at)} &middot; {formatTime(n.created_at)}
                  </p>

                  {awaitingResponse ? (
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" className="gap-1.5" tooltip="Confirm you'll judge this tournament" onClick={() => respond(n, judgeRowId, "approved")}>
                        <Check className="h-3.5 w-3.5" /> Accept
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        tooltip="Decline this invitation"
                        onClick={() => respond(n, judgeRowId, "removed")}
                      >
                        <X className="h-3.5 w-3.5" /> Decline
                      </Button>
                    </div>
                  ) : n.link && !judgeRowId ? (
                    <Button asChild variant="outline" size="sm" className="mt-3" tooltip="Open">
                      <Link href={n.link}>Open</Link>
                    </Button>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  {view === "unread" ? (
                    <Button variant="outline" size="sm" tooltip="Mark as read" onClick={() => markRead(n.id, true)}>
                      Mark Read
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" tooltip="Move this back to Unread" onClick={() => markRead(n.id, false)}>
                      Mark Unread
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" aria-label="Delete notification" tooltip="Delete" onClick={() => remove(n.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
          {view === "unread" ? "You're all caught up — no unread notifications." : "No read notifications yet."}
        </p>
      )}
    </div>
  );
}
