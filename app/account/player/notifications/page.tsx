import type { Metadata } from "next";

import { NotificationsPanel } from "@/components/dashboard/player/NotificationsPanel";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import type { NotificationRow } from "@/lib/types/database";
import { PageHeader } from "@/components/dashboard/erp";

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
      <PageHeader
        eyebrow="Player Dashboard"
        title="Notifications"
        description={<>Includes judge invitations for any tournament you&apos;ve been asked to judge.</>}
      />
      <div className="mt-5">
        <NotificationsPanel notifications={notifications} />
      </div>
    </div>
  );
}
