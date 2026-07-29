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
  battleType: BattleType;
  tournamentType: TournamentType;
  startsAt: string;
  locationName: string;
  province: string;
  latitude: number;
  longitude: number;
  organizerName: string;
  communityName: string | null;
  prizePool: number;
  championName: string | null;
  viewCount: number;
  isUpcoming: boolean;
  participants: MockParticipant[];
  judges: string[];
  sponsors: string[];
  liveStatus: "not_started" | "ongoing" | "completed";
}

export const PROVINCES = [
  "Metro Manila",
  "Cebu",
  "Davao del Sur",
  "Pampanga",
  "Laguna",
  "Iloilo",
];

export const COMMUNITIES = [
  "Metro Bey League",
  "Cebu Spin Circuit",
  "Davao Blade Forge",
  "Pampanga Right Spin Co.",
];

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
    startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 6).toISOString(),
    locationName: "SM Megamall Event Center",
    province: "Metro Manila",
    latitude: 14.5852,
    longitude: 121.0567,
    organizerName: "Metro Bey League",
    communityName: "Metro Bey League",
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
    startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 12).toISOString(),
    locationName: "Ayala Center Cebu Activity Area",
    province: "Cebu",
    latitude: 10.3181,
    longitude: 123.9053,
    organizerName: "Cebu Spin Circuit",
    communityName: "Cebu Spin Circuit",
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
    startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
    locationName: "Abreeza Mall Atrium",
    province: "Davao del Sur",
    latitude: 7.0736,
    longitude: 125.6128,
    organizerName: "Davao Blade Forge",
    communityName: "Davao Blade Forge",
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
    startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
    locationName: "SM City Pampanga Grand Atrium",
    province: "Pampanga",
    latitude: 15.0794,
    longitude: 120.6197,
    organizerName: "Pampanga Right Spin Co.",
    communityName: "Pampanga Right Spin Co.",
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
    startsAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    locationName: "SM City Santa Rosa Event Hall",
    province: "Laguna",
    latitude: 14.3122,
    longitude: 121.0983,
    organizerName: "Metro Bey League",
    communityName: "Metro Bey League",
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
    startsAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
    locationName: "Iloilo Convention Center",
    province: "Iloilo",
    latitude: 10.7202,
    longitude: 122.5621,
    organizerName: "Cebu Spin Circuit",
    communityName: null,
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
