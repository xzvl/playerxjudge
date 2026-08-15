import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CommunityManagementPanel, type CommunityListItem } from "@/components/dashboard/organizer/CommunityManagementPanel";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import type { CommunityRow } from "@/lib/types/database";

export const metadata: Metadata = { title: "Community Management", robots: { index: false, follow: false } };

export default async function CommunityManagementPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/organizer/community");

  const supabase = await createClient();
  const [{ data: owned }, { data: organizerRows }] = await Promise.all([
    supabase.from("communities").select("*").eq("owner_id", user.id),
    supabase.from("organizers").select("community_id").eq("profile_id", user.id),
  ]);

  const helpedIds = ((organizerRows as { community_id: string }[] | null) ?? []).map((r) => r.community_id);
  let helped: CommunityRow[] = [];
  if (helpedIds.length > 0) {
    const { data } = await supabase.from("communities").select("*").in("id", helpedIds);
    helped = (data as CommunityRow[] | null) ?? [];
  }

  // "Owned" and "helped" can overlap (an owner could theoretically also have
  // an `organizers` row) — dedupe by id, newest/most-recently-started first.
  // `started_at` (when the community itself began, set on its own Settings
  // page) is what the "Since" line on each card shows too — falls back to
  // `created_at` (when the row was made) for communities that never set one.
  const byId = new Map<string, CommunityRow>();
  for (const c of [...((owned as CommunityRow[] | null) ?? []), ...helped]) byId.set(c.id, c);
  const communities = [...byId.values()].sort(
    (a, b) => new Date(b.started_at ?? b.created_at).getTime() - new Date(a.started_at ?? a.created_at).getTime()
  );

  const items: CommunityListItem[] = communities.map((c) => ({
    community: c,
    isOwner: c.owner_id === user.id,
  }));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label-mono text-primary">Organizer Dashboard</p>
          <h1 className="heading mt-2 text-3xl">Community Management</h1>
          <p className="mt-2 max-w-xl text-sm text-on-surface/60">Communities you own or help run.</p>
        </div>
        <Button asChild size="sm" className="shrink-0 gap-1.5" tooltip="Set up a new community">
          <Link href="/account/organizer/community/new">
            <Plus className="h-3.5 w-3.5" /> Apply Community
          </Link>
        </Button>
      </div>
      <div className="mt-8">
        <CommunityManagementPanel items={items} />
      </div>
    </div>
  );
}
