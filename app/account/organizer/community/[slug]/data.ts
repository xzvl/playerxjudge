import { cache } from "react";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { CommunityRow } from "@/lib/types/database";

// Unlike getManagedTournament (a single organizer_id column), a community
// can be managed by its owner *or* any staff row in `organizers` — so this
// can't filter by a single column the way that one does. `cache()` dedupes
// this within a request the same way, for whichever pages (Members,
// Settings) call it.
export const getManagedCommunity = cache(async (userId: string, slug: string): Promise<CommunityRow> => {
  const supabase = await createClient();
  const { data: community } = await supabase.from("communities").select("*").eq("slug", slug).maybeSingle();
  if (!community) notFound();

  if (community.owner_id !== userId) {
    const { data: organizerRow } = await supabase
      .from("organizers")
      .select("id")
      .eq("community_id", community.id)
      .eq("profile_id", userId)
      .maybeSingle();
    if (!organizerRow) notFound();
  }

  return community as CommunityRow;
});
