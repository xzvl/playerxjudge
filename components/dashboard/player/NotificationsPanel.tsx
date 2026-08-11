"use client";

import { useState } from "react";
import { Archive, BellRing, CheckCircle2, Clock3, EyeOff, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatTime } from "@/lib/format";
import { MOCK_NOTIFICATIONS, type MockNotification, type NotificationStatus } from "@/lib/mock/player-dashboard";

const TYPE_ICONS: Record<MockNotification["type"], typeof BellRing> = {
  approval: CheckCircle2,
  reminder: Clock3,
  result: BellRing,
  system: Info,
};

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState<MockNotification[]>(MOCK_NOTIFICATIONS);
  const [view, setView] = useState<"active" | "archived">("active");

  function setStatus(id: string, status: NotificationStatus) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, status } : n)));
  }

  const visible = notifications.filter((n) => (view === "active" ? n.status === "active" : n.status === "archived"));

  return (
    <div>
      <Tabs value={view} onValueChange={(v) => setView(v as "active" | "archived")} className="mb-6">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
      </Tabs>

      {visible.length > 0 ? (
        <ul className="space-y-3">
          {visible.map((n) => {
            const Icon = TYPE_ICONS[n.type];
            return (
              <li key={n.id} className="flex items-start gap-4 border border-outline-variant/25 bg-surface-container-low p-4">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border border-outline-variant/40 text-primary">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-on-surface">{n.title}</p>
                  <p className="mt-1 text-sm text-on-surface/60">{n.body}</p>
                  <p className="label-mono mt-2 text-on-surface/30">
                    {formatDate(n.createdAt)} &middot; {formatTime(n.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {view === "active" ? (
                    <>
                      <Button variant="outline" size="sm" tooltip="Hide this notification" onClick={() => setStatus(n.id, "hidden")} className="gap-1.5">
                        <EyeOff className="h-3.5 w-3.5" /> Hide
                      </Button>
                      <Button variant="outline" size="sm" tooltip="Move this to Archived" onClick={() => setStatus(n.id, "archived")} className="gap-1.5">
                        <Archive className="h-3.5 w-3.5" /> Archive
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" tooltip="Move this back to Active" onClick={() => setStatus(n.id, "active")}>
                      Restore
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
          {view === "active" ? "You're all caught up — no active notifications." : "No archived notifications."}
        </p>
      )}
    </div>
  );
}
