import type { ReactNode } from "react";

import type { NavUser } from "@/components/layout/ProfileMenu";

// Content wrapper for the player view. The sidebar (Player / Beyblade /
// Tournament / Matches) and top bar come from the route's layout, see
// TournamentConsoleShell. The title/organizer/user props are still accepted
// so existing callers keep compiling.
export function PlayerViewShell({
  children,
}: {
  tournamentTitle?: string;
  tournamentSlug?: string;
  organizedBy?: string;
  user?: NavUser | null;
  notificationCount?: number;
  children: ReactNode;
}) {
  return <div className="mx-auto min-w-0 max-w-[1440px] text-on-surface">{children}</div>;
}
