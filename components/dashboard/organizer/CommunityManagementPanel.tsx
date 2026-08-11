import { Sparkles, Users2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { MOCK_ORGANIZED_COMMUNITIES } from "@/lib/mock/organizer-dashboard";

export function CommunityManagementPanel() {
  if (MOCK_ORGANIZED_COMMUNITIES.length === 0) {
    return (
      <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
        You don&apos;t manage any communities yet.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {MOCK_ORGANIZED_COMMUNITIES.map((community) => (
        <div key={community.id} className="border border-outline-variant/25 bg-surface-container-low p-5">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-outline-variant/40 text-primary">
              <Users2 className="h-4 w-4" aria-hidden="true" />
            </div>
            {community.isPremium ? (
              <Badge variant="default" className="gap-1">
                <Sparkles className="h-3 w-3" aria-hidden="true" /> Premium
              </Badge>
            ) : (
              <Badge variant="outline">Free</Badge>
            )}
          </div>
          <h3 className="heading text-base leading-tight">{community.name}</h3>
          <p className="mt-1 text-xs text-on-surface/50">{community.province}</p>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-on-surface/70">{community.memberCount} members</p>
            <p className="label-mono text-on-surface/40">Since {formatDate(community.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
