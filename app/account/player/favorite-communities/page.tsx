import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FavoriteCommunitiesPanel, type FavoriteCommunityEntry } from "@/components/dashboard/player/FavoriteCommunitiesPanel";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Favorite Communities", robots: { index: false, follow: false } };

interface ProfileCommunityRow {
  created_at: string;
  communities: { id: string; slug: string; name: string; province: string | null } | null;
}

export default async function FavoriteCommunitiesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/player/favorite-communities");

  const supabase = await createClient();
  const { data } = await supabase
    .from("profile_communities")
    .select("created_at, communities(id, slug, name, province)")
    .eq("profile_id", user.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  // There's no "left a community" history tracked (profile_communities has
  // no end-date column) — unlike a mock Current/Past split, this can only
  // ever show current memberships honestly.
  const communities: FavoriteCommunityEntry[] = ((data as unknown as ProfileCommunityRow[] | null) ?? [])
    .filter((r): r is ProfileCommunityRow & { communities: NonNullable<ProfileCommunityRow["communities"]> } => r.communities !== null)
    .map((r) => ({
      communityId: r.communities.id,
      slug: r.communities.slug,
      name: r.communities.name,
      province: r.communities.province,
      joinedAt: r.created_at,
    }));

  return (
    <div>
      <p className="label-mono text-primary">Player Dashboard</p>
      <h1 className="heading mt-2 text-3xl">Favorite Communities</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Communities you belong to.</p>
      <div className="mt-8">
        <FavoriteCommunitiesPanel communities={communities} />
      </div>
    </div>
  );
}
