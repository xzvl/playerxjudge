// Real-data source for the public tournament-discovery surfaces (homepage
// listings, /tournaments, /tournaments/[slug], the "Find a Tournament Near
// You" map). Shaped to match `MockTournament` exactly so the existing
// TournamentCard/TournamentTable/TournamentDetailsModal/TournamentMap
// components don't need to change at all — just fed real rows instead of
// the mock array. A few mock fields have no live backing yet and are
// filled with honest defaults rather than fabricated data:
//   - judges/sponsors: no public-readable "judges assigned to this
//     tournament" or "sponsors of this tournament" relationship exists yet
//     (community_judges isn't publicly selectable, and there's no
//     tournament-sponsor table at all) — both come back empty.
//   - thumbnailColor: derived deterministically from the tournament id
//     (no thumbnail-color column), so it's at least stable across renders.
import { createClient } from "@/lib/supabase/server";
import type { MockParticipant, MockTournament } from "@/lib/mock/tournaments";
import type { Tournament } from "@/lib/types/database";

const THUMBNAIL_PALETTE = ["#ed0d11", "#603e39", "#454747", "#ffb4ab"];

function thumbnailColorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return THUMBNAIL_PALETTE[Math.abs(hash) % THUMBNAIL_PALETTE.length];
}

interface TournamentListingRow extends Tournament {
  profiles: { display_name: string } | null;
  communities: { name: string; logo_url: string | null } | null;
}

const PUBLIC_STATUS_EXCLUDES = ["draft", "cancelled"] as const;

// When "Vary prizes by number of participants" is on, the flat
// tournament_prizes rows aren't the active structure — instead, whichever
// range section contains the tournament's current participant count is.
// No section matching the current count shows no prizes rather than
// guessing (e.g. before anyone's registered, or a gap between sections).
function resolveDisplayPrizes(
  t: TournamentListingRow,
  participantCount: number,
  flatPrizes: { placement: string; prizeName: string }[]
): { placement: string; prizeName: string }[] {
  if (!t.prize_uses_ranges) return flatPrizes;
  const section = t.prize_range_sections.find((s) => participantCount >= s.rangeStart && participantCount <= s.rangeEnd);
  return section?.prizes ?? [];
}

function mapRow(
  t: TournamentListingRow,
  participants: MockParticipant[],
  prizes: { placement: string; prizeName: string }[],
  stageStarted: boolean,
  preRegisteredPlayers?: { id: string; bladerName: string }[]
): MockTournament {
  return {
    id: t.id,
    slug: t.slug,
    title: t.title,
    shortDescription: t.short_description,
    description: t.description,
    rules: t.rules
      .split("\n")
      .map((r) => r.trim())
      .filter(Boolean),
    thumbnailColor: thumbnailColorFor(t.id),
    bannerUrl: t.banner_url,
    thumbnailUrl: t.thumbnail_url,
    battleType: t.battle_type,
    tournamentType: t.tournament_type,
    startsAt: t.starts_at,
    locationName: t.location_name ?? "",
    addressLine: t.address_line ?? "",
    city: t.city ?? "",
    province: t.province ?? "",
    latitude: t.latitude ?? 0,
    longitude: t.longitude ?? 0,
    organizerName: t.profiles?.display_name ?? "Organizer",
    communityName: t.communities?.name ?? null,
    communityLogoUrl: t.communities?.logo_url ?? null,
    prizePool: t.prize_pool,
    championName: t.champion_name,
    viewCount: t.view_count,
    isUpcoming: t.status !== "completed" && new Date(t.starts_at).getTime() >= Date.now(),
    participants: [...participants].sort((a, b) => a.seed - b.seed),
    judges: [],
    sponsors: [],
    liveStatus: t.status === "completed" ? "completed" : t.status === "ongoing" ? "ongoing" : "not_started",
    registrationStartsAt: t.registration_starts_at,
    registrationDeadline: t.registration_deadline,
    prizes: resolveDisplayPrizes(t, participants.length, prizes),
    prizeUsesRanges: t.prize_uses_ranges,
    prizeRangeSections: t.prize_uses_ranges
      ? t.prize_range_sections.map((s) => ({ rangeStart: s.rangeStart, rangeEnd: s.rangeEnd, prizes: s.prizes }))
      : undefined,
    requiresPreregistrationPayment: t.requires_preregistration_payment,
    preregistrationAmount: t.preregistration_amount,
    preregistrationInstructions: t.preregistration_instructions,
    preregistrationQrUrl: t.preregistration_qr_url,
    preRegisteredPlayers,
    stageStarted,
  };
}

// Only fetched for the single-tournament detail page (not the listing
// grid) — reads the public-safe `public_preregistrations` view, which
// already masks blader names for guests who checked "hide me on public"
// (see 20250101000023_preregistration_status_and_public_view.sql), so
// nothing further needs masking here.
async function fetchPreRegisteredPlayers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: string
): Promise<{ id: string; bladerName: string }[]> {
  const { data } = await supabase
    .from("public_preregistrations")
    .select("id, blader_name, created_at")
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((p) => ({ id: p.id, bladerName: p.blader_name }));
}

async function fetchParticipantsByTournament(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentIds: string[]
): Promise<Map<string, MockParticipant[]>> {
  if (tournamentIds.length === 0) return new Map();

  const { data } = await supabase
    .from("tournament_participants")
    .select("tournament_id, name, team_name, seed")
    .in("tournament_id", tournamentIds);

  const byTournament = new Map<string, MockParticipant[]>();
  for (const p of (data as { tournament_id: string; name: string; team_name: string | null; seed: number }[] | null) ?? []) {
    const list = byTournament.get(p.tournament_id) ?? [];
    list.push({ name: p.team_name ?? p.name, avatarUrl: null, seed: p.seed });
    byTournament.set(p.tournament_id, list);
  }
  return byTournament;
}

// Which of these tournaments have generated at least one match — same
// signal (and reasoning) as `tournamentStarted` on the organizer's own
// Participants page (app/account/organizer/tournament/[slug]/participants/page.tsx):
// once the group stage or the final bracket has real matches, the
// tournament has actually started regardless of what the scheduled
// `starts_at` says. A plain existence check per id, not a count — nothing
// here needs how many.
async function fetchStartedTournamentIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentIds: string[]
): Promise<Set<string>> {
  if (tournamentIds.length === 0) return new Set();

  const { data } = await supabase.from("matches").select("tournament_id").in("tournament_id", tournamentIds);
  return new Set((data as { tournament_id: string }[] | null)?.map((m) => m.tournament_id) ?? []);
}

async function fetchPrizesByTournament(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentIds: string[]
): Promise<Map<string, { placement: string; prizeName: string }[]>> {
  if (tournamentIds.length === 0) return new Map();

  const { data } = await supabase
    .from("tournament_prizes")
    .select("tournament_id, placement, prize_name, sort_order")
    .in("tournament_id", tournamentIds)
    .order("sort_order");

  const byTournament = new Map<string, { placement: string; prizeName: string }[]>();
  for (const p of (data as { tournament_id: string; placement: string; prize_name: string }[] | null) ?? []) {
    const list = byTournament.get(p.tournament_id) ?? [];
    list.push({ placement: p.placement, prizeName: p.prize_name });
    byTournament.set(p.tournament_id, list);
  }
  return byTournament;
}

export async function getPublicTournamentListings(): Promise<MockTournament[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tournaments")
    .select("*, profiles(display_name), communities(name, logo_url)")
    .not("status", "in", `(${PUBLIC_STATUS_EXCLUDES.join(",")})`)
    .order("starts_at", { ascending: false });

  const rows = (data as unknown as TournamentListingRow[] | null) ?? [];
  if (rows.length === 0) return [];

  const tournamentIds = rows.map((r) => r.id);
  const [participantsByTournament, prizesByTournament, startedIds] = await Promise.all([
    fetchParticipantsByTournament(supabase, tournamentIds),
    fetchPrizesByTournament(supabase, tournamentIds),
    fetchStartedTournamentIds(supabase, tournamentIds),
  ]);

  return rows.map((t) =>
    mapRow(t, participantsByTournament.get(t.id) ?? [], prizesByTournament.get(t.id) ?? [], startedIds.has(t.id))
  );
}

// For "Find a Tournament Near You" — same public listing, but only
// tournaments with a real pin dropped (no fabricated (0,0) markers) and
// still upcoming.
export async function getPublicUpcomingTournamentsWithLocation(): Promise<MockTournament[]> {
  const listings = await getPublicTournamentListings();
  return listings.filter((t) => t.isUpcoming && (t.latitude !== 0 || t.longitude !== 0));
}

export async function getPublicTournamentCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("tournaments")
    .select("id", { count: "exact", head: true })
    .not("status", "in", `(${PUBLIC_STATUS_EXCLUDES.join(",")})`);
  return count ?? 0;
}

export async function getPublicTournamentBySlug(slug: string): Promise<MockTournament | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tournaments")
    .select("*, profiles(display_name), communities(name, logo_url)")
    .eq("slug", slug)
    .not("status", "in", `(${PUBLIC_STATUS_EXCLUDES.join(",")})`)
    .maybeSingle();

  const row = data as unknown as TournamentListingRow | null;
  if (!row) return null;

  const [participantsByTournament, prizesByTournament, preRegisteredPlayers, startedIds] = await Promise.all([
    fetchParticipantsByTournament(supabase, [row.id]),
    fetchPrizesByTournament(supabase, [row.id]),
    fetchPreRegisteredPlayers(supabase, row.id),
    fetchStartedTournamentIds(supabase, [row.id]),
  ]);
  return mapRow(
    row,
    participantsByTournament.get(row.id) ?? [],
    prizesByTournament.get(row.id) ?? [],
    startedIds.has(row.id),
    preRegisteredPlayers
  );
}
