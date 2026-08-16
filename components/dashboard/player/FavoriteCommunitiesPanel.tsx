import { Heart } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

export interface FavoriteCommunityEntry {
  communityId: string;
  slug: string;
  name: string;
  province: string | null;
  joinedAt: string;
}

export function FavoriteCommunitiesPanel({ communities }: { communities: FavoriteCommunityEntry[] }) {
  if (communities.length === 0) {
    return (
      <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
        You haven&apos;t joined any communities yet.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {communities.map((community) => (
        <div key={community.communityId} className="border border-outline-variant/25 bg-surface-container-low p-5">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-outline-variant/40 text-primary">
              <Heart className="h-4 w-4" aria-hidden="true" />
            </div>
            <Badge variant="success">Current</Badge>
          </div>
          <h3 className="heading text-base leading-tight">{community.name}</h3>
          <p className="mt-1 text-xs text-on-surface/50">{community.province ?? "—"}</p>
          <p className="label-mono mt-3 text-on-surface/40">Member since {formatDate(community.joinedAt)}</p>
        </div>
      ))}
    </div>
  );
}
