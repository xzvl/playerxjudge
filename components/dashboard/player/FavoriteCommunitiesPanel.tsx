import { Heart } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { MOCK_COMMUNITY_MEMBERSHIPS } from "@/lib/mock/player-dashboard";

export function FavoriteCommunitiesPanel() {
  if (MOCK_COMMUNITY_MEMBERSHIPS.length === 0) {
    return (
      <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
        You haven&apos;t joined any communities yet.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {MOCK_COMMUNITY_MEMBERSHIPS.map((membership) => (
        <div key={membership.communityName} className="border border-outline-variant/25 bg-surface-container-low p-5">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-outline-variant/40 text-primary">
              <Heart className="h-4 w-4" aria-hidden="true" />
            </div>
            {membership.endedAt === null ? (
              <Badge variant="success">Current</Badge>
            ) : (
              <Badge variant="outline">Past</Badge>
            )}
          </div>
          <h3 className="heading text-base leading-tight">{membership.communityName}</h3>
          <p className="mt-1 text-xs text-on-surface/50">{membership.province}</p>
          <p className="label-mono mt-3 text-on-surface/40">
            {formatDate(membership.startedAt)} &ndash;{" "}
            {membership.endedAt ? formatDate(membership.endedAt) : "Present"}
          </p>
        </div>
      ))}
    </div>
  );
}
