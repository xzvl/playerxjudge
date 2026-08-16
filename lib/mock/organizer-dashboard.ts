import type { BattleType, TournamentStatus, TournamentType } from "@/lib/types/database";

// Mirrors the mock-data convention in `lib/mock/tournaments.ts`. The public
// tournament listing (`components/tournaments/TournamentListings.tsx`)
// still reads from mock data too, so wiring organizer tournament
// management to the live DB tables (which do exist — see
// supabase/migrations) wouldn't be visible anywhere else in the app yet.
// This stays mock/demo until that pipeline is rebuilt.

export interface MockOrganizedTournament {
  id: string;
  title: string;
  slug: string;
  status: TournamentStatus;
  battleType: BattleType;
  tournamentType: TournamentType;
  startsAt: string;
  registrationDeadline: string;
  locationName: string;
  province: string;
  maxParticipants: number;
  participantCount: number;
  entryFee: number;
  prizePool: number;
  viewCount: number;
}

export const MOCK_ORGANIZED_TOURNAMENTS: MockOrganizedTournament[] = [
  {
    id: "o1",
    title: "Quezon City Winter Cup",
    slug: "quezon-city-winter-cup",
    status: "draft",
    battleType: "solo",
    tournamentType: "major",
    startsAt: "2026-09-15T12:00:00.000Z",
    registrationDeadline: "2026-09-10T12:00:00.000Z",
    locationName: "SM North EDSA Skydome",
    province: "Metro Manila",
    maxParticipants: 64,
    participantCount: 0,
    entryFee: 250,
    prizePool: 20000,
    viewCount: 12,
  },
  {
    id: "o2",
    title: "BGC Rooftop Rumble",
    slug: "bgc-rooftop-rumble",
    status: "published",
    battleType: "2v2",
    tournamentType: "minor",
    startsAt: "2026-08-20T10:00:00.000Z",
    registrationDeadline: "2026-08-17T12:00:00.000Z",
    locationName: "Bonifacio High Street Activity Area",
    province: "Metro Manila",
    maxParticipants: 32,
    participantCount: 6,
    entryFee: 150,
    prizePool: 8000,
    viewCount: 340,
  },
  {
    id: "o3",
    title: "Marikina River Clash",
    slug: "marikina-river-clash",
    status: "registration_open",
    battleType: "solo",
    tournamentType: "casual",
    startsAt: "2026-08-12T09:00:00.000Z",
    registrationDeadline: "2026-08-10T12:00:00.000Z",
    locationName: "Marikina Riverbanks Center",
    province: "Metro Manila",
    maxParticipants: 32,
    participantCount: 18,
    entryFee: 0,
    prizePool: 0,
    viewCount: 512,
  },
  {
    id: "o4",
    title: "Pasig Bridge Brawl",
    slug: "pasig-bridge-brawl",
    status: "registration_closed",
    battleType: "3v3",
    tournamentType: "major",
    startsAt: "2026-08-09T11:00:00.000Z",
    registrationDeadline: "2026-08-06T12:00:00.000Z",
    locationName: "Estancia Mall Event Grounds",
    province: "Metro Manila",
    maxParticipants: 24,
    participantCount: 24,
    entryFee: 300,
    prizePool: 15000,
    viewCount: 980,
  },
  {
    id: "o5",
    title: "Taguig Sky Battle",
    slug: "taguig-sky-battle",
    status: "ongoing",
    battleType: "solo",
    tournamentType: "emergency",
    startsAt: "2026-08-06T08:00:00.000Z",
    registrationDeadline: "2026-08-05T12:00:00.000Z",
    locationName: "Venice Grand Canal Mall",
    province: "Metro Manila",
    maxParticipants: 16,
    participantCount: 16,
    entryFee: 100,
    prizePool: 4000,
    viewCount: 1760,
  },
  {
    id: "o6",
    title: "Antipolo Hillside Open",
    slug: "antipolo-hillside-open",
    status: "completed",
    battleType: "solo",
    tournamentType: "minor",
    startsAt: "2026-07-15T09:00:00.000Z",
    registrationDeadline: "2026-07-12T12:00:00.000Z",
    locationName: "Robinsons Place Antipolo",
    province: "Rizal",
    maxParticipants: 20,
    participantCount: 20,
    entryFee: 100,
    prizePool: 5000,
    viewCount: 2140,
  },
  {
    id: "o7",
    title: "Caloocan Community Cup",
    slug: "caloocan-community-cup",
    status: "cancelled",
    battleType: "5v5",
    tournamentType: "casual",
    startsAt: "2026-07-01T09:00:00.000Z",
    registrationDeadline: "2026-06-28T12:00:00.000Z",
    locationName: "Caloocan Sports Complex",
    province: "Metro Manila",
    maxParticipants: 20,
    participantCount: 5,
    entryFee: 0,
    prizePool: 0,
    viewCount: 64,
  },
];

export type RegistrationStatus = "pending" | "confirmed" | "checked_in" | "cancelled";

export interface MockRegistration {
  id: string;
  tournamentId: string;
  playerName: string;
  teamName: string | null;
  status: RegistrationStatus;
  seed: number | null;
  registeredAt: string;
  checkedInAt: string | null;
}

export const MOCK_ORGANIZER_REGISTRATIONS: MockRegistration[] = [
  { id: "r1", tournamentId: "o3", playerName: "J. Reyes", teamName: null, status: "confirmed", seed: 1, registeredAt: "2026-08-01T09:00:00.000Z", checkedInAt: null },
  { id: "r2", tournamentId: "o3", playerName: "M. Santos", teamName: null, status: "confirmed", seed: 2, registeredAt: "2026-08-01T09:15:00.000Z", checkedInAt: null },
  { id: "r3", tournamentId: "o3", playerName: "A. Cruz", teamName: null, status: "pending", seed: null, registeredAt: "2026-08-04T14:20:00.000Z", checkedInAt: null },
  { id: "r4", tournamentId: "o3", playerName: "K. Villareal", teamName: null, status: "cancelled", seed: null, registeredAt: "2026-08-02T10:00:00.000Z", checkedInAt: null },
  { id: "r5", tournamentId: "o4", playerName: "D. Manalo", teamName: "Team Voltbreak", status: "confirmed", seed: 1, registeredAt: "2026-07-28T09:00:00.000Z", checkedInAt: null },
  { id: "r6", tournamentId: "o4", playerName: "L. Villanueva", teamName: "Team Overdrive", status: "confirmed", seed: 2, registeredAt: "2026-07-29T09:00:00.000Z", checkedInAt: null },
  { id: "r7", tournamentId: "o4", playerName: "R. Aquino", teamName: "Team Frostbyte", status: "confirmed", seed: 3, registeredAt: "2026-07-29T11:30:00.000Z", checkedInAt: null },
  { id: "r8", tournamentId: "o5", playerName: "N. Bautista", teamName: null, status: "checked_in", seed: 1, registeredAt: "2026-08-03T09:00:00.000Z", checkedInAt: "2026-08-06T07:40:00.000Z" },
  { id: "r9", tournamentId: "o5", playerName: "P. Ramos", teamName: null, status: "checked_in", seed: 2, registeredAt: "2026-08-03T09:10:00.000Z", checkedInAt: "2026-08-06T07:45:00.000Z" },
  { id: "r10", tournamentId: "o5", playerName: "K. Tan", teamName: null, status: "confirmed", seed: 3, registeredAt: "2026-08-03T09:20:00.000Z", checkedInAt: null },
  { id: "r11", tournamentId: "o5", playerName: "R. Dela Cruz", teamName: null, status: "confirmed", seed: 4, registeredAt: "2026-08-03T09:25:00.000Z", checkedInAt: null },
  { id: "r12", tournamentId: "o6", playerName: "K. Villareal", teamName: null, status: "checked_in", seed: 1, registeredAt: "2026-07-10T09:00:00.000Z", checkedInAt: "2026-07-15T08:30:00.000Z" },
];

export interface MockSponsorLink {
  id: string;
  sponsorName: string;
  tier: "bronze" | "silver" | "gold";
  tournamentTitle: string;
  clicks: number;
  views: number;
}

export const MOCK_SPONSOR_LINKS: MockSponsorLink[] = [
  { id: "s1", sponsorName: "Spin City", tier: "gold", tournamentTitle: "Quezon City Winter Cup", clicks: 84, views: 1120 },
  { id: "s2", sponsorName: "Blade Forge", tier: "silver", tournamentTitle: "BGC Rooftop Rumble", clicks: 46, views: 610 },
  { id: "s3", sponsorName: "Right Spin Co.", tier: "bronze", tournamentTitle: "Pasig Bridge Brawl", clicks: 22, views: 340 },
  { id: "s4", sponsorName: "Spin City", tier: "gold", tournamentTitle: "Taguig Sky Battle", clicks: 130, views: 1980 },
  { id: "s5", sponsorName: "Blade Forge", tier: "silver", tournamentTitle: "Antipolo Hillside Open", clicks: 58, views: 890 },
];

export type ReportStatus = "open" | "resolved" | "dismissed";

export interface MockReport {
  id: string;
  reporterName: string;
  targetType: "tournament" | "comment" | "profile";
  targetLabel: string;
  reason: string;
  status: ReportStatus;
  createdAt: string;
}

export const MOCK_REPORTS: MockReport[] = [
  { id: "rp1", reporterName: "M. Santos", targetType: "comment", targetLabel: "Comment on Pasig Bridge Brawl", reason: "Spam / off-topic promotion.", status: "open", createdAt: "2026-08-05T10:00:00.000Z" },
  { id: "rp2", reporterName: "A. Cruz", targetType: "profile", targetLabel: "Profile: @unruly_blader", reason: "Harassment in tournament chat.", status: "open", createdAt: "2026-08-04T16:20:00.000Z" },
  { id: "rp3", reporterName: "K. Tan", targetType: "tournament", targetLabel: "Caloocan Community Cup", reason: "Listing had incorrect venue address.", status: "resolved", createdAt: "2026-06-30T09:00:00.000Z" },
  { id: "rp4", reporterName: "R. Aquino", targetType: "comment", targetLabel: "Comment on Taguig Sky Battle", reason: "Duplicate comment, likely a bug.", status: "dismissed", createdAt: "2026-08-02T08:15:00.000Z" },
];

export interface MockRevenueEntry {
  id: string;
  tournamentTitle: string;
  amount: number;
  method: "GCash" | "Maya" | "Bank Transfer" | "Card";
  status: "paid" | "pending";
  paidAt: string | null;
}

export const MOCK_REVENUE: MockRevenueEntry[] = [
  { id: "pay1", tournamentTitle: "Pasig Bridge Brawl", amount: 7200, method: "GCash", status: "paid", paidAt: "2026-07-30T09:00:00.000Z" },
  { id: "pay2", tournamentTitle: "Taguig Sky Battle", amount: 1600, method: "Maya", status: "paid", paidAt: "2026-08-04T09:00:00.000Z" },
  { id: "pay3", tournamentTitle: "BGC Rooftop Rumble", amount: 900, method: "GCash", status: "paid", paidAt: "2026-08-05T09:00:00.000Z" },
  { id: "pay4", tournamentTitle: "BGC Rooftop Rumble", amount: 600, method: "Bank Transfer", status: "pending", paidAt: null },
  { id: "pay5", tournamentTitle: "Antipolo Hillside Open", amount: 2000, method: "Card", status: "paid", paidAt: "2026-07-14T09:00:00.000Z" },
];

export interface MockOrganizedCommunity {
  id: string;
  name: string;
  province: string;
  memberCount: number;
  isPremium: boolean;
  createdAt: string;
}

export const MOCK_ORGANIZED_COMMUNITIES: MockOrganizedCommunity[] = [
  { id: "c1", name: "Quezon City Spinners", province: "Metro Manila", memberCount: 214, isPremium: true, createdAt: "2025-09-01T00:00:00.000Z" },
  { id: "c2", name: "BGC Blade Club", province: "Metro Manila", memberCount: 88, isPremium: false, createdAt: "2026-02-10T00:00:00.000Z" },
  { id: "c3", name: "Marikina Riverbank League", province: "Metro Manila", memberCount: 56, isPremium: false, createdAt: "2026-05-20T00:00:00.000Z" },
];
