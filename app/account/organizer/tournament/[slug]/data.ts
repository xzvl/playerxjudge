import { cache } from "react";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Tournament } from "@/lib/types/database";

// `cache()` dedupes this within a single request — the layout and whichever
// tab page is active both call it, but it only hits Supabase once.
export const getManagedTournament = cache(async (organizerId: string, slug: string): Promise<Tournament> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tournaments")
    .select("*")
    .eq("organizer_id", organizerId)
    .eq("slug", slug)
    .maybeSingle();

  if (!data) notFound();
  return data as Tournament;
});

// The /backend/tournaments/[slug] counterpart — no `organizer_id` filter,
// since staff need to reach any tournament, not just their own. Callers
// are responsible for the `isCurrentUserStaff()` gate first (see
// app/backend/tournaments/[slug]/layout.tsx); this then relies on RLS
// ("tournaments_select_published_or_own", which already includes
// `is_admin()`) for the actual read permission.
export const getManagedTournamentForStaff = cache(async (slug: string): Promise<Tournament> => {
  const supabase = await createClient();
  const { data } = await supabase.from("tournaments").select("*").eq("slug", slug).maybeSingle();

  if (!data) notFound();
  return data as Tournament;
});
