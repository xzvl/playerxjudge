"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getUnreadNotificationCount } from "@/lib/supabase/get-user";
import type { RoleActionState } from "@/lib/validations/roles";
import type { NotificationRow } from "@/lib/types/database";

// The header bell (NotificationsBell) lives in the root layout, which
// Next.js does *not* re-run just because a child page navigated or a
// server action revalidated one specific path — layouts persist across
// navigation by design. `revalidatePath("/", "layout")` additionally marks
// the root layout itself stale, so the bell's count is part of what
// refreshes after these actions instead of staying frozen at whatever it
// was when the page first loaded.
function revalidateNotificationSurfaces() {
  revalidatePath("/account/player/notifications");
  revalidatePath("/", "layout");
}

// Client-callable wrapper around getUnreadNotificationCount — lets
// NotificationsBell re-fetch its own badge on navigation (see its
// usePathname effect) without waiting on a layout refresh at all, since
// invites/responses often come from a *different* browser session than the
// one whose bell needs updating.
export async function fetchUnreadNotificationCount(): Promise<number> {
  return getUnreadNotificationCount();
}

// Backs the bell's dropdown preview (see NotificationsBell) — the same
// rows the full /account/player/notifications page shows, just capped and
// newest-first regardless of read state.
export async function fetchRecentNotifications(limit = 8): Promise<NotificationRow[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as NotificationRow[] | null) ?? [];
}

// Marks one notification read/unread — the plain "Mark as read" / "Mark as
// unread" actions in NotificationsPanel.
export async function setNotificationRead(notificationId: string, isRead: boolean): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("notifications").update({ is_read: isRead }).eq("id", notificationId);
  if (error) return { status: "error", message: error.message };

  revalidateNotificationSurfaces();
  return { status: "success" };
}

export async function deleteNotification(notificationId: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("notifications").delete().eq("id", notificationId);
  if (error) return { status: "error", message: error.message };

  revalidateNotificationSurfaces();
  return { status: "success" };
}

// A judge accepting/declining a tournament invite from their notification
// (see inviteJudge in app/account/organizer/tournament/[slug]/judges-actions.ts,
// which created both the `judges` row and the notification carrying its id
// in `?respond=`). Notifies the organizer of the outcome, and rewrites the
// original invite notification's own link/title to reflect the outcome —
// not just `is_read`. Both NotificationsPanel and NotificationsBell key
// "does this still need Accept/Decline" off `link` containing `?respond=`,
// and that has to survive a fresh fetch (a reopened bell, a reload), not
// just live in this session's React state, or a resolved invite would show
// the buttons again the next time it's fetched.
export async function respondToJudgeInvite(
  judgeRowId: string,
  notificationId: string,
  decision: "approved" | "removed"
): Promise<RoleActionState & { link?: string | null; title?: string }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();

  const { data: judgeRow, error: judgeError } = await supabase
    .from("judges")
    .update({ status: decision, decided_at: new Date().toISOString() })
    .eq("id", judgeRowId)
    .eq("judge_id", user.id)
    .select("tournament_id")
    .single();
  if (judgeError) return { status: "error", message: judgeError.message };

  const [{ data: tournament }, { data: judgeProfile }] = await Promise.all([
    supabase.from("tournaments").select("title, slug, organizer_id").eq("id", judgeRow.tournament_id).maybeSingle(),
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
  ]);

  let notifyError: string | null = null;
  if (tournament) {
    const judgeName = judgeProfile?.display_name ?? "A judge";
    const { error } = await supabase.from("notifications").insert({
      profile_id: tournament.organizer_id,
      type: "judge_response",
      title: decision === "approved" ? "Judge invitation accepted" : "Judge invitation declined",
      body:
        decision === "approved"
          ? `${judgeName} confirmed as a judge for "${tournament.title}".`
          : `${judgeName} declined to judge "${tournament.title}".`,
      link: `/account/organizer/tournament/${tournament.slug}/stations`,
    });
    if (error) notifyError = error.message;
  }

  // Accepting gets a link into the judge's own live view of the
  // tournament (the "Open" button); declining has nowhere useful to send
  // them, so the link just clears.
  const newTitle = decision === "approved" ? "Judge invitation — Accepted" : "Judge invitation — Declined";
  const newLink = decision === "approved" && tournament ? `/tournaments/${tournament.slug}/judge` : null;

  const { error: markReadError } = await supabase
    .from("notifications")
    .update({ is_read: true, title: newTitle, link: newLink })
    .eq("id", notificationId);

  revalidateNotificationSurfaces();

  // Your own response was recorded either way (the `judges` row update
  // above already succeeded) — these are just "the organizer might not
  // hear about it" follow-on failures, surfaced rather than swallowed.
  if (notifyError) return { status: "error", message: `Response recorded, but the organizer wasn't notified: ${notifyError}`, link: newLink, title: newTitle };
  if (markReadError) return { status: "error", message: markReadError.message, link: newLink, title: newTitle };
  return { status: "success", link: newLink, title: newTitle };
}
