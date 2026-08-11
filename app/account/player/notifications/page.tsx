import type { Metadata } from "next";

import { NotificationsPanel } from "@/components/dashboard/player/NotificationsPanel";

export const metadata: Metadata = { title: "Notifications", robots: { index: false, follow: false } };

export default function NotificationsPage() {
  return (
    <div>
      <p className="label-mono text-primary">Player Dashboard</p>
      <h1 className="heading mt-2 text-3xl">Notifications</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Hide notifications you&apos;ve seen or archive them for later.</p>
      <div className="mt-8">
        <NotificationsPanel />
      </div>
    </div>
  );
}
