import type { Metadata } from "next";

import { NotificationsPanel } from "@/components/dashboard/player/NotificationsPanel";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import type { NotificationRow } from "@/lib/types/database";

export const metadata: Metadata = { title: "Notifications", robots: { index: false, follow: false } };

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  let notifications: NotificationRow[] = [];

  if (user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false });
    notifications = (data as NotificationRow[] | null) ?? [];
  }

  return (
    <div>
      <p className="label-mono text-primary">Player Dashboard</p>
      <h1 className="heading mt-2 text-3xl">Notifications</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Includes judge invitations for any tournament you&apos;ve been asked to judge.</p>
      <div className="mt-8">
        <NotificationsPanel notifications={notifications} />
      </div>
    </div>
  );
}
