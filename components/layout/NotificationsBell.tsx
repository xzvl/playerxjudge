"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  fetchRecentNotifications,
  fetchUnreadNotificationCount,
  respondToJudgeInvite,
  setNotificationRead,
} from "@/app/account/notifications-actions";
import type { NotificationRow } from "@/lib/types/database";

// A judge-invite notification's link carries the `judges` row id it's
// about (see inviteJudge, app/account/organizer/tournament/[slug]/judges-actions.ts)
// — pulled out here to power the inline Accept/Decline below. Same helper
// as NotificationsPanel's (kept local rather than shared — six lines).
function respondJudgeRowId(n: NotificationRow): string | null {
  if (n.type !== "judge_invite" || !n.link) return null;
  try {
    return new URL(n.link, "http://localhost").searchParams.get("respond");
  } catch {
    return null;
  }
}

// `count` is the server-rendered value from whichever layout mounted this
// (Header / PlayerViewHeaderActions) — correct on first paint, but that
// layout doesn't re-run its own data fetching just because the user
// navigated to a different page that shares it (Next.js layouts persist
// across navigation by design), and a notification arriving from someone
// else's session (an invite, a response) can't reach it at all. So once
// mounted, this re-fetches the real count itself on every route change —
// `enabled` skips that entirely for signed-out visitors, for whom it's
// always 0 anyway.
//
// Clicking the bell opens a preview dropdown (fetched fresh on open, not
// kept in sync with the count effect above): clicking a notification's
// title marks it read and follows its link; anything still awaiting a
// decision (a judge invite) gets inline Accept/Decline instead, and
// anything else unread gets a Mark as read action — mirrors
// NotificationsPanel's own handling of the same three cases, just
// compacted for the dropdown.
export function NotificationsBell({ count: initialCount = 0, enabled = false }: { count?: number; enabled?: boolean }) {
  const [count, setCount] = useState(initialCount);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [respondedIds, setRespondedIds] = useState<Set<string>>(new Set());
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetchUnreadNotificationCount().then((n) => {
      if (!cancelled) setCount(n);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, pathname]);

  useEffect(() => {
    if (!open || !enabled) return;
    let cancelled = false;
    setLoading(true);
    fetchRecentNotifications(8).then((rows) => {
      if (!cancelled) {
        setNotifications(rows);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, enabled]);

  function markLocallyRead(id: string) {
    setNotifications((prev) => prev?.map((x) => (x.id === id ? { ...x, is_read: true } : x)) ?? prev);
    setCount((c) => Math.max(0, c - 1));
  }

  function handleTitleClick(n: NotificationRow) {
    setOpen(false);
    if (!n.is_read) {
      markLocallyRead(n.id);
      void setNotificationRead(n.id, true);
    }
    if (n.link) router.push(n.link);
  }

  function markRead(n: NotificationRow) {
    if (n.is_read) return;
    markLocallyRead(n.id);
    void setNotificationRead(n.id, true);
  }

  async function respond(n: NotificationRow, judgeRowId: string, decision: "approved" | "removed") {
    // Hides Accept/Decline immediately; the follow-up update (once the
    // server responds with the real link/title) is what makes that persist
    // past this session — see respondToJudgeInvite.
    setRespondedIds((prev) => new Set(prev).add(n.id));
    if (!n.is_read) markLocallyRead(n.id);
    const result = await respondToJudgeInvite(judgeRowId, n.id, decision);
    setNotifications((prev) =>
      prev?.map((x) => (x.id === n.id ? { ...x, link: result.link ?? null, title: result.title ?? x.title } : x)) ?? prev
    );
  }

  if (!enabled) {
    return (
      <Button variant="ghost" size="icon" aria-label="Notifications">
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${count ? `, ${count} unread` : ""}`}>
          <Bell className="h-5 w-5" />
          {count > 0 ? (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[9px] text-on-primary">
              {count > 9 ? "9+" : count}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="px-3 py-2.5 normal-case tracking-normal text-on-surface">Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator className="my-0" />

        {loading ? (
          <p className="px-3 py-8 text-center text-sm text-on-surface/40">Loading…</p>
        ) : notifications && notifications.length > 0 ? (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((n) => {
              const judgeRowId = respondJudgeRowId(n);
              const awaitingResponse = judgeRowId !== null && !respondedIds.has(n.id);
              return (
                <div key={n.id} className="border-b border-outline-variant/15 px-3 py-2.5 last:border-0 hover:bg-white/[0.02]">
                  <button type="button" onClick={() => handleTitleClick(n)} className="block w-full text-left">
                    <span className="flex items-center gap-2">
                      {!n.is_read ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" /> : null}
                      <span className={cn("min-w-0 flex-1 truncate", n.is_read ? "text-on-surface/70" : "font-medium text-on-surface")}>
                        {n.title}
                      </span>
                    </span>
                    {n.body ? <span className="mt-0.5 block line-clamp-2 text-xs text-on-surface/50">{n.body}</span> : null}
                    <span className="label-mono mt-1 block text-[9px] text-on-surface/30">
                      {formatDate(n.created_at)} &middot; {formatTime(n.created_at)}
                    </span>
                  </button>

                  {awaitingResponse ? (
                    <div className="mt-2 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => respond(n, judgeRowId, "approved")}
                        className="label-mono flex items-center gap-1 bg-primary px-2 py-1 text-[10px] text-on-primary transition-colors hover:brightness-110"
                      >
                        <Check className="h-3 w-3" /> Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => respond(n, judgeRowId, "removed")}
                        className="label-mono flex items-center gap-1 border border-outline-variant/40 px-2 py-1 text-[10px] text-on-surface/70 transition-colors hover:border-primary hover:text-primary"
                      >
                        <X className="h-3 w-3" /> Decline
                      </button>
                    </div>
                  ) : n.link && !judgeRowId ? (
                    <Link
                      href={n.link}
                      onClick={() => setOpen(false)}
                      className="label-mono mt-1.5 inline-flex items-center gap-1 border border-outline-variant/40 px-2 py-1 text-[10px] text-on-surface/70 transition-colors hover:border-primary hover:text-primary"
                    >
                      Open
                    </Link>
                  ) : !n.is_read ? (
                    <button
                      type="button"
                      onClick={() => markRead(n)}
                      className="label-mono mt-1.5 flex items-center gap-1 text-[10px] text-on-surface/40 transition-colors hover:text-on-surface"
                    >
                      <Check className="h-3 w-3" /> Mark as read
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="px-3 py-8 text-center text-sm text-on-surface/40">You&apos;re all caught up.</p>
        )}

        <DropdownMenuSeparator className="my-0" />
        <DropdownMenuItem asChild className="justify-center">
          <Link href="/account/player/notifications" onClick={() => setOpen(false)} className="text-primary">
            View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
