"use client";

import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";

export function NotificationsBell({ count = 0 }: { count?: number }) {
  return (
    <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${count ? `, ${count} unread` : ""}`}>
      <Bell className="h-5 w-5" />
      {count > 0 ? (
        <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[9px] text-on-primary">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Button>
  );
}
