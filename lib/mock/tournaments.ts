import type { BattleType, TournamentType } from "@/lib/types/database";

export interface MockParticipant {
  name: string;
  avatarUrl: string | null;
  seed: number;
}

export interface MockTournament {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  rules: string[];
  thumbnailColor: string;
  // Real data only — the uploaded horizontal banner image, when set (see
  // ThumbnailSection). Falls back to the thumbnailColor + Swords icon
  // placeholder when absent.
  bannerUrl?: string | null;
  // Real data only — the uploaded square thumbnail image, when set. Used
  // for card-style (box) thumbnails, e.g. the homepage's Upcoming grid.
  thumbnailUrl?: string | null;
  battleType: BattleType;
  tournamentType: TournamentType;
  startsAt: string;
  locationName: string;
  // Real data only (see lib/tournaments/public-listings.ts) — the address
  // fields split apart on the wizard's Location section. Optional so the
  // static mock array below doesn't need updating for pages that don't use
  // them.
  addressLine?: string;
  city?: string;
  province: string;
  latitude: number;
  longitude: number;
  organizerName: string;
  communityName: string | null;
  communityLogoUrl: string | null;
  prizePool: number;
  championName: string | null;
  viewCount: number;
  isUpcoming: boolean;
  participants: MockParticipant[];
  judges: string[];
  sponsors: string[];
  liveStatus: "not_started" | "ongoing" | "completed";
  // Real data only — see lib/tournaments/public-listings.ts.
  registrationStartsAt?: string | null;
  registrationDeadline?: string | null;
  prizes?: { placement: string; prizeName: string }[];
  // Real data only — whether this tournament uses "Vary prizes by number of
  // participants" instead of the flat prize list above.
  prizeUsesRanges?: boolean;
  // Real data only — every participant-range section's full prize list (not
  // just whichever one currently applies), so public pages can show
  // organizers' full tiered prize breakdown up front.
  prizeRangeSections?: {
    rangeStart: number;
    rangeEnd: number;
    prizes: { placement: string; prizeName: string }[];
  }[];
  // Real data only — pre-registration payment config from Settings (see
  // shared-actions.ts#uploadPaymentQr).
  requiresPreregistrationPayment?: boolean;
  preregistrationAmount?: number | null;
  preregistrationInstructions?: string | null;
  preregistrationQrUrl?: string | null;
  // Real data only — guests who've submitted the public Pre-register form
  // (see /tournaments/[slug]/page.tsx's "Pre-Registered" section, shown
  // before the tournament starts). `bladerName` is already masked
  // server-side for anyone who checked "hide me on public" — see the
  // `public_preregistrations` view.
  preRegisteredPlayers?: { id: string; bladerName: string }[];
}

export const PROVINCES = [
  "Metro Manila",
  "Cebu",
  "Davao del Sur",
  "Pampanga",
  "Laguna",
  "Iloilo",
];

export interface MockCommunity {
  name: string;
  province: string;
}

export const COMMUNITIES: MockCommunity[] = [
  { name: "Metro Bey League", province: "Metro Manila" },
  { name: "Cebu Spin Circuit", province: "Cebu" },
  { name: "Davao Blade Forge", province: "Davao del Sur" },
  { name: "Pampanga Right Spin Co.", province: "Pampanga" },
];

// Placeholder community badges (stand in for uploaded logos in `communities.logo_url`).
// Communities without one fall back to the default map pin.
function communityBadge(initials: string, bg: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="32" fill="${bg}"/><text x="32" y="41" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#fff" text-anchor="middle">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const COMMUNITY_LOGOS: Record<string, string> = {
  "Metro Bey League": communityBadge("MBL", "#ed0d11"),
  "Cebu Spin Circuit": communityBadge("CSC", "#603e39"),
};

export const MOCK_TOURNAMENTS: MockTournament[] = [
  {
    id: "t1",
    slug: "metro-manila-open-x",
    title: "Metro Manila Open X",
    shortDescription: "The flagship season opener for Metro Manila bladers.",
    description:
      "The Metro Manila Open X kicks off the competitive season with a stacked bracket of solo bladers battling for the top ranking points. Expect a fast-paced single elimination format across two X-Ultimate Base arenas.",
    rules: [
      "3-point match format, best of 5 bursts/KOs/spin-finishes.",
      "Only official Beyblade X series parts are allowed.",
      "Illegal modifications result in immediate disqualification.",
    ],
    thumbnailColor: "#ed0d11",
    battleType: "solo",
    tournamentType: "major",
    startsAt: "2026-08-04T12:00:00.000Z",
    locationName: "SM Megamall Event Center",
    province: "Metro Manila",
    latitude: 14.5852,
    longitude: 121.0567,
    organizerName: "Metro Bey League",
    communityName: "Metro Bey League",
    communityLogoUrl: COMMUNITY_LOGOS["Metro Bey League"],
    prizePool: 15000,
    championName: null,
    viewCount: 1240,
    isUpcoming: true,
    participants: [
      { name: "J. Reyes", avatarUrl: null, seed: 1 },
      { name: "M. Santos", avatarUrl: null, seed: 2 },
      { name: "A. Cruz", avatarUrl: null, seed: 3 },
    ],
    judges: ["Head Judge R. Dela Cruz", "Judge K. Tan"],
    sponsors: ["Spin City", "Blade Forge"],
    liveStatus: "not_started",
  },
  {
    id: "t2",
    slug: "cebu-tag-clash-2v2",
    title: "Cebu Tag Clash 2v2",
    shortDescription: "Duo teams battle it out in the Visayas region.",
    description:
      "A community-favorite 2v2 team format where synergy matters as much as spin power. Round robin group stage feeds into a single elimination final four.",
    rules: [
      "Teams of 2, alternating launches.",
      "Round robin group stage, top 4 advance.",
      "Standard Beyblade X burst/stamina scoring.",
    ],
    thumbnailColor: "#603e39",
    battleType: "2v2",
    tournamentType: "minor",
    startsAt: "2026-08-10T12:00:00.000Z",
    locationName: "Ayala Center Cebu Activity Area",
    province: "Cebu",
    latitude: 10.3181,
    longitude: 123.9053,
    organizerName: "Cebu Spin Circuit",
    communityName: "Cebu Spin Circuit",
    communityLogoUrl: COMMUNITY_LOGOS["Cebu Spin Circuit"],
    prizePool: 6000,
    championName: null,
    viewCount: 512,
    isUpcoming: true,
    participants: [
      { name: "Team Vortex", avatarUrl: null, seed: 1 },
      { name: "Team Ignis", avatarUrl: null, seed: 2 },
    ],
    judges: ["Judge L. Villanueva"],
    sponsors: ["Right Spin Co."],
    liveStatus: "not_started",
  },
  {
    id: "t3",
    slug: "davao-casual-friday",
    title: "Davao Casual Friday",
    shortDescription: "Low-stakes weekly casual meetup for all skill levels.",
    description:
      "Drop in, register on-site, and battle. Casual Friday is a beginner-friendly weekly meetup with a Swiss-format bracket so everyone gets multiple matches.",
    rules: ["Swiss format, 4 rounds.", "Beginner and unofficial parts allowed."],
    thumbnailColor: "#454747",
    battleType: "solo",
    tournamentType: "casual",
    startsAt: "2026-08-01T12:00:00.000Z",
    locationName: "Abreeza Mall Atrium",
    province: "Davao del Sur",
    latitude: 7.0736,
    longitude: 125.6128,
    organizerName: "Davao Blade Forge",
    communityName: "Davao Blade Forge",
    communityLogoUrl: null,
    prizePool: 0,
    championName: null,
    viewCount: 203,
    isUpcoming: true,
    participants: [],
    judges: ["Judge P. Ramos"],
    sponsors: [],
    liveStatus: "not_started",
  },
  {
    id: "t4",
    slug: "pampanga-emergency-showdown",
    title: "Pampanga Emergency Showdown",
    shortDescription: "Last-minute replacement event filling the regional slot.",
    description:
      "Announced on short notice after a scheduling conflict, this emergency showdown keeps the regional ranking circuit on track with a compact single elimination bracket.",
    rules: ["Single elimination, best of 3.", "Check-in closes 15 minutes before start."],
    thumbnailColor: "#ffb4ab",
    battleType: "3v3",
    tournamentType: "emergency",
    startsAt: "2026-07-31T12:00:00.000Z",
    locationName: "SM City Pampanga Grand Atrium",
    province: "Pampanga",
    latitude: 15.0794,
    longitude: 120.6197,
    organizerName: "Pampanga Right Spin Co.",
    communityName: "Pampanga Right Spin Co.",
    communityLogoUrl: null,
    prizePool: 4000,
    championName: null,
    viewCount: 88,
    isUpcoming: true,
    participants: [],
    judges: ["Judge D. Manalo"],
    sponsors: ["Spin City"],
    liveStatus: "not_started",
  },
  {
    id: "t5",
    slug: "laguna-regional-finals",
    title: "Laguna Regional Finals",
    shortDescription: "Season-ending regional finals with the top 16 ranked players.",
    description:
      "The culmination of the Laguna regional season. Top 16 ranked bladers face off in a double elimination bracket to crown the regional champion.",
    rules: ["Double elimination, top 16 seeded.", "Winner earns bye into national qualifiers."],
    thumbnailColor: "#ed0d11",
    battleType: "solo",
    tournamentType: "major",
    startsAt: "2026-07-24T12:00:00.000Z",
    locationName: "SM City Santa Rosa Event Hall",
    province: "Laguna",
    latitude: 14.3122,
    longitude: 121.0983,
    organizerName: "Metro Bey League",
    communityName: "Metro Bey League",
    communityLogoUrl: COMMUNITY_LOGOS["Metro Bey League"],
    prizePool: 20000,
    championName: "K. Villareal",
    viewCount: 3980,
    isUpcoming: false,
    participants: [
      { name: "K. Villareal", avatarUrl: null, seed: 1 },
      { name: "N. Bautista", avatarUrl: null, seed: 2 },
    ],
    judges: ["Head Judge R. Dela Cruz"],
    sponsors: ["Blade Forge", "Right Spin Co."],
    liveStatus: "completed",
  },
  {
    id: "t6",
    slug: "iloilo-squad-battle-5v5",
    title: "Iloilo Squad Battle 5v5",
    shortDescription: "Full squad warfare — five bladers per team, winner takes all.",
    description:
      "Iloilo's biggest team format event. Five-person squads battle through a round robin group stage into elimination playoffs.",
    rules: ["5v5 team format.", "Round robin groups, top 2 per group advance."],
    thumbnailColor: "#603e39",
    battleType: "5v5",
    tournamentType: "major",
    startsAt: "2026-07-09T12:00:00.000Z",
    locationName: "Iloilo Convention Center",
    province: "Iloilo",
    latitude: 10.7202,
    longitude: 122.5621,
    organizerName: "Cebu Spin Circuit",
    communityName: null,
    communityLogoUrl: null,
    prizePool: 25000,
    championName: "Team Aetherblade",
    viewCount: 5120,
    isUpcoming: false,
    participants: [],
    judges: ["Judge L. Villanueva", "Judge K. Tan"],
    sponsors: ["Spin City"],
    liveStatus: "completed",
  },
];

export const PLATFORM_STATS = {
  players: 4820,
  judges: 156,
  tournaments: 312,
  communities: 48,
};
