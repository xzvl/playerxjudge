// Real-data source for the public community-discovery surfaces
// (/communities' map + list, and /communities/[slug]) — only
// `approval_status: 'approved'` communities are ever returned here (see
// 20250101000033_community_status_fields.sql); a pending application stays
// invisible to the public, direct link included, until an admin approves
// it. Tournaments hosted use the same "not draft/cancelled" visibility rule
// the rest of the public tournament surfaces use (lib/tournaments/public-listings.ts).
import { createClient } from "@/lib/supabase/server";
import type { CommunityRow, Tournament } from "@/lib/types/database";

const PUBLIC_STATUS_EXCLUDES = ["draft", "cancelled"] as const;

export interface PublicCommunityListing {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  pinLogoUrl: string | null;
  locationLine: string;
  memberCount: number;
  // The "Since" date shown on each card — the community's own started date
  // when it's set (its Settings page), falling back to when the row itself
  // was created for communities that never set one.
  sinceDate: string;
  latitude: number | null;
  longitude: number | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  messengerUrl: string | null;
}

export interface PublicHostedTournament {
  id: string;
  slug: string;
  title: string;
  thumbnailUrl: string | null;
  startsAt: string;
  status: Tournament["status"];
}

function locationLine(c: CommunityRow): string {
  return [c.address_line, c.city, c.province].filter(Boolean).join(", ") || "—";
}

function mapListingRow(c: CommunityRow): PublicCommunityListing {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    logoUrl: c.logo_url,
    pinLogoUrl: c.pin_logo_url,
    locationLine: locationLine(c),
    memberCount: c.member_count,
    sinceDate: c.started_at ?? c.created_at,
    latitude: c.latitude,
    longitude: c.longitude,
    facebookUrl: c.facebook_url,
    instagramUrl: c.instagram_url,
    youtubeUrl: c.youtube_url,
    messengerUrl: c.messenger_url,
  };
}

export async function getPublicApprovedCommunities(): Promise<PublicCommunityListing[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("communities").select("*").eq("approval_status", "approved");
  const communities = ((data as CommunityRow[] | null) ?? []).map(mapListingRow);
  // Newest/most-recently-started first — `started_at` can't be sorted at
  // the query level with a `created_at` fallback (Supabase's query builder
  // has no COALESCE), so this sorts the same "sinceDate" the cards show.
  return communities.sort((a, b) => new Date(b.sinceDate).getTime() - new Date(a.sinceDate).getTime());
}

// For "Find a Community Near You" — same approved list, but only ones with
// a real pin dropped (no fabricated (0,0) markers), same rule
// getPublicUpcomingTournamentsWithLocation uses for tournaments.
export async function getPublicCommunitiesWithLocation(): Promise<PublicCommunityListing[]> {
  const communities = await getPublicApprovedCommunities();
  return communities.filter((c) => c.latitude !== null && c.longitude !== null && (c.latitude !== 0 || c.longitude !== 0));
}

export async function getPublicCommunityBySlug(slug: string): Promise<CommunityRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("communities")
    .select("*")
    .eq("slug", slug)
    .eq("approval_status", "approved")
    .maybeSingle();
  return (data as CommunityRow | null) ?? null;
}

export async function getPublicTournamentsHostedBy(communityId: string): Promise<PublicHostedTournament[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tournaments")
    .select("id, slug, title, thumbnail_url, starts_at, status")
    .eq("community_id", communityId)
    .not("status", "in", `(${PUBLIC_STATUS_EXCLUDES.join(",")})`)
    .order("starts_at", { ascending: false });

  return ((data as Pick<Tournament, "id" | "slug" | "title" | "thumbnail_url" | "starts_at" | "status">[] | null) ?? []).map((t) => ({
    id: t.id,
    slug: t.slug,
    title: t.title,
    thumbnailUrl: t.thumbnail_url,
    startsAt: t.starts_at,
    status: t.status,
  }));
}
