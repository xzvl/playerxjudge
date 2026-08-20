// Hand-authored types mirroring supabase/migrations/*.sql.
// Once a live Supabase project exists, replace with generated types via:
//   npx supabase gen types typescript --project-id <id> > lib/types/database.ts

import type { PrizeRangeSection, TournamentFormatSettings } from "@/lib/validations/tournament-wizard";

export type AppRole = "player" | "judge" | "sponsor" | "organizer" | "manager" | "admin";

export type RoleStatus = "pending" | "approved" | "rejected";

export type JudgeAssignmentStatus = "pending" | "approved" | "removed";

export type SubscriptionPlan = "free" | "premium";

export type BattleType = "solo" | "2v2" | "3v3" | "4v4" | "5v5" | "team_battle";

export type TournamentType = "casual" | "minor" | "major" | "emergency" | "league";

export type TournamentStatus =
  | "draft"
  | "published"
  | "registration_open"
  | "registration_closed"
  | "ongoing"
  | "completed"
  | "cancelled";

export type BracketFormat =
  | "single_elimination"
  | "double_elimination"
  | "round_robin"
  | "swiss";

export type MatchStatus = "scheduled" | "ongoing" | "completed" | "disputed";

// Plain `type` aliases (not `interface`) for every shape used as a Row in
// `Database.Tables` below — TypeScript only treats object-literal `type`
// aliases as structurally assignable to `Record<string, unknown>`; an
// `interface` with the same members fails that check ("index signature is
// missing"), which otherwise silently collapses the whole Database generic
// to `never` wherever it's used (e.g. `createServerClient<Database>()`).
// Mirrors the `public.user_role` Postgres enum (20250101000001_extensions_enums.sql)
// — a profile's own single platform-level role, distinct from `AppRole`
// below (which backs `profile_roles`, the apply-and-get-approved system for
// player/judge/organizer/sponsor). `is_admin()` in Postgres checks this
// same column (`role in ('admin', 'super_admin')`); the admin console
// (app/backend) mirrors that check in the app layer.
export type PlatformRole = "guest" | "player" | "judge" | "organizer" | "sponsor" | "admin" | "super_admin";

// Mirrors supabase/migrations/20250101000035_judge_beyz_id.sql — null until
// a judge uploads their BeyZ ID; 'pending' from upload until an admin
// reviews it; 'approved' is what makes them a "Certified Judge" (see
// components/dashboard/judge/badges.tsx).
export type BeyzIdStatus = "pending" | "approved" | "declined";

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
  country: string | null;
  province: string | null;
  city: string | null;
  community_id: string | null;
  favorite_beyblade: string | null;
  bio: string | null;
  social_links: Record<string, string> | null;
  blader_names: string[];
  main_photo_url: string | null;
  full_body_photo_url: string | null;
  half_body_photo_url: string | null;
  beyz_id_url: string | null;
  beyz_id_status: BeyzIdStatus | null;
  // Mirrors supabase/migrations/20250101000051_google_username_generation.sql
  // — 'email' or 'google', whatever Supabase Auth put in the account's own
  // raw_app_meta_data->>'provider' at signup. null on accounts created
  // before this column existed (see /backend/players, which reads that as
  // "Email").
  provider: string | null;
  // Mirrors supabase/migrations/20250101000037_backend_admin.sql — Player
  // "remove" (see /backend/players) is ban/suspend, not account deletion.
  is_banned: boolean;
  subscription_plan: SubscriptionPlan;
  role: PlatformRole;
  created_at: string;
};

export type ProfileCommunityStatus = "pending" | "approved";

export type ProfileCommunity = {
  id: string;
  profile_id: string;
  community_id: string;
  created_at: string;
  // Mirrors supabase/migrations/20250101000032_community_join_requests.sql —
  // a player picking a community in Account Settings now requests to join
  // (pending) rather than joining outright; an organizer accepts/declines it
  // on the community's Members page.
  status: ProfileCommunityStatus;
};

export type ProfileRole = {
  id: string;
  profile_id: string;
  role: AppRole;
  status: RoleStatus;
  requested_at: string;
  decided_at: string | null;
  decided_by: string | null;
  notes: string | null;
};

export type CommunityJudge = {
  id: string;
  community_id: string;
  judge_id: string;
  status: JudgeAssignmentStatus;
  requested_at: string;
  decided_at: string | null;
  decided_by: string | null;
};

// Mirrors supabase/migrations/20250101000034_sponsor_listings.sql — a
// profile can now own several sponsor listings (one row each), same
// shape as `communities`. `package_id`/`tier`/`verified` predate that
// migration and aren't wired to anything in the app yet.
export type SponsorApprovalStatus = "pending" | "approved" | "declined";

export type SponsorDonationTier = "1_month" | "6_months" | "1_year";

export type Sponsor = {
  id: string;
  profile_id: string;
  company_name: string;
  logo_url: string | null;
  website_url: string | null;
  facebook_url: string | null;
  phone: string | null;
  package_id: string | null;
  tier: "bronze" | "silver" | "gold";
  verified: boolean;
  donation_tier: SponsorDonationTier | null;
  tier_requested_at: string | null;
  tier_expires_at: string | null;
  approval_status: SponsorApprovalStatus;
  created_at: string;
  updated_at: string;
};

export interface Community {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  province: string;
  member_count: number;
  is_premium: boolean;
  created_at: string;
}

// Mirrors the real `public.tournaments` columns (see
// supabase/migrations/20250101000003_tournament_tables.sql and
// 20250101000010_tournament_wizard.sql). `format_settings` holds the
// tournament-creation-wizard configuration (stage/bracket/tie-break setup)
// that doesn't have its own column — see lib/validations/tournament-wizard.ts.
// `type` (not `interface`), same reason as `Profile` above: it's used as a
// Row in `Database.Tables` and only object-literal `type` aliases satisfy
// the `Record<string, unknown>` structural check that generic requires.
// Mirrors supabase/migrations/20250101000002_core_tables.sql's `provinces`
// reference table.
export type Province = {
  id: string;
  name: string;
  region: string | null;
  created_at: string;
};

export type Tournament = {
  id: string;
  organizer_id: string;
  community_id: string | null;
  category_id: string | null;
  type_id: string | null;
  title: string;
  slug: string;
  short_description: string;
  description: string;
  rules: string;
  thumbnail_url: string | null;
  banner_url: string | null;
  battle_type: BattleType;
  tournament_type: TournamentType;
  status: TournamentStatus;
  bracket_format: BracketFormat;
  format_settings: TournamentFormatSettings;
  is_archived: boolean;
  starts_at: string;
  ends_at: string | null;
  registration_starts_at: string | null;
  registration_deadline: string | null;
  location_name: string | null;
  address_line: string | null;
  city: string | null;
  province_id: string | null;
  // Free-text province, filled by the address-autocomplete lookup on the
  // wizard's Location section — see searchAddressSuggestions in
  // app/account/organizer/tournament/shared-actions.ts. `province_id` above
  // is left in place but unused by the wizard now.
  province: string | null;
  latitude: number | null;
  longitude: number | null;
  max_participants: number | null;
  entry_fee: number;
  prize_pool: number;
  prize_snake_drafted: boolean;
  prize_same_tier_prizes: boolean;
  // Mirrors supabase/migrations/20250101000019_prize_range_sections.sql.
  prize_uses_ranges: boolean;
  prize_range_sections: PrizeRangeSection[];
  champion_name: string | null;
  champion_registration_id: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
  // Mirrors supabase/migrations/20250101000020_preregistration_payment.sql.
  requires_preregistration_payment: boolean;
  preregistration_amount: number | null;
  preregistration_instructions: string | null;
  preregistration_qr_url: string | null;
  // Mirrors supabase/migrations/20250101000028_organizer_console_station.sql
  // — the organizer's own "stadium" pick in the shared judge console.
  // Judges have their own via `judges.station_id`; the organizer doesn't
  // have a `judges` row, so their pick lives here instead.
  organizer_station_id: string | null;
};

export type PreregistrationPaymentStatus = "failed" | "pending" | "confirmed";

// Mirrors supabase/migrations/20250101000020_preregistration_payment.sql —
// guest submissions from the public "Pre-register" popup. Not account-bound
// (no player_id), unlike `registrations` below.
export type TournamentPreregistration = {
  id: string;
  tournament_id: string;
  full_name: string;
  blader_name: string;
  facebook_name: string;
  hide_public: boolean;
  advance_payment: boolean;
  payment_screenshot_url: string | null;
  payment_status: PreregistrationPaymentStatus;
  created_at: string;
  // Mirrors supabase/migrations/20250101000050_preregistration_username.sql
  // — the submitter's own username, captured server-side from their session
  // at submit time (never client-trusted) when they were signed in. Powers
  // the organizer's no-approval auto-link on promotion to the roster — see
  // addPreRegisteredParticipant and bulkAddParticipants.
  username: string | null;
};

// Mirrors the `public_preregistrations` view (see
// 20250101000023_preregistration_status_and_public_view.sql) — the
// public-safe read of pre-registrations for /tournaments/[slug]'s
// "Pre-Registered" list. `blader_name` is already masked server-side for
// rows with hide_public = true; nothing sensitive (full name, Facebook,
// payment info) is exposed here at all.
export type PublicPreregistration = {
  id: string;
  tournament_id: string;
  blader_name: string;
  hide_public: boolean;
  created_at: string;
};

// Mirrors supabase/migrations/20250101000011_tournament_participants.sql —
// the roster/seeding/group-assignment data behind the organizer's Manage
// Participants and Manage Groups screens. Deliberately separate from
// `registrations`, which requires a real `profiles` row.
export type TournamentGroup = {
  id: string;
  tournament_id: string;
  label: string;
  sort_order: number;
  created_at: string;
};

export type TournamentParticipant = {
  id: string;
  tournament_id: string;
  group_id: string | null;
  seed: number;
  name: string;
  team_name: string | null;
  created_at: string;
  updated_at: string;
};

export type ParticipantLinkStatus = "pending" | "approved";

// Mirrors supabase/migrations/20250101000036_participant_links.sql — a
// self-serve, organizer-confirmed claim connecting a real account to a
// `tournament_participants` roster entry. See its migration comment for
// the uniqueness rules (one claim per participant, one per profile per
// tournament) and why there's no 'declined' status.
export type ParticipantLink = {
  id: string;
  participant_id: string;
  tournament_id: string;
  profile_id: string;
  status: ParticipantLinkStatus;
  requested_at: string;
  decided_at: string | null;
  decided_by: string | null;
};

// Mirrors supabase/migrations/20250101000012_prizes_location_enums.sql.
// `placement` is free-form ("Champion", "Top 8 Finalist", ...) rather than
// an enum — see buildPlacementOptions in lib/validations/tournament-wizard.ts.
export type TournamentPrize = {
  id: string;
  tournament_id: string;
  placement: string;
  prize_name: string;
  sort_order: number;
  created_at: string;
};

// Mirrors supabase/migrations/20250101000016_tournament_workspace_panels.sql
// — the Announcements/Stations/Reports/Log workspace pages.
export type TournamentAnnouncement = {
  id: string;
  tournament_id: string;
  posted_by: string;
  message: string;
  created_at: string;
};

export type TournamentStationStatus = "idle" | "in_progress" | "complete";

export type TournamentStation = {
  id: string;
  tournament_id: string;
  name: string;
  status: TournamentStationStatus;
  current_match_id: string | null;
  sort_order: number;
  created_at: string;
};

// Per-tournament judge assignment — scaffolded (table + RLS) in
// 20250101000003_tournament_tables.sql, given the invite/confirm lifecycle
// and station assignment in 20250101000024_tournament_judges.sql. Distinct
// from `CommunityJudge` above, which is community-scoped ("apply to judge
// for this community") rather than tied to one tournament.
export type Judge = {
  id: string;
  tournament_id: string;
  judge_id: string;
  role_note: string | null;
  assigned_at: string;
  status: JudgeAssignmentStatus;
  decided_at: string | null;
  // The station this judge is currently working, if any — at most one
  // judge per station (partial unique index on this column).
  station_id: string | null;
};

export type TournamentReportStatus = "open" | "resolved" | "dismissed";

export type TournamentReport = {
  id: string;
  tournament_id: string;
  reporter_id: string | null;
  target_label: string;
  reason: string;
  status: TournamentReportStatus;
  created_at: string;
};

export type TournamentLogEntry = {
  id: string;
  tournament_id: string;
  actor: string;
  action: string;
  created_at: string;
};

export type FinishType = "burst" | "spin" | "extreme" | "over";

// Denormalized (name, not just a live reference) — snapshotted onto the
// battle at submit time so a later deck edit or combo rename doesn't
// retroactively change history, and so anywhere Match Details renders can
// show it without an extra lookup. `id` still rides along for future
// combo-level stats (e.g. a combo's own win rate) once something reads it
// that way. See JudgeConsole's PlayerScoreState.comboSlots/mergeBattleLog.
export interface MatchBattleCombo {
  id: string;
  name: string;
}

export type MatchBattle = {
  winnerId: string;
  finishType: FinishType;
  // null when that side has no approved linked account, no active deck, or
  // an empty slot for this battle's position in their 3-combo cycle.
  participantACombo?: MatchBattleCombo | null;
  participantBCombo?: MatchBattleCombo | null;
};

// Mirrors supabase/migrations/20250101000013_group_stage_matches.sql —
// participant_a_id/participant_b_id/winner_id point at tournament_participants
// (repointed from `registrations`, which requires a real account). `a`/`b`
// (games won per side) is all the organizer-facing report form sets today.
// The rest backs the judge-facing scoring console (app/tournaments/[slug]/judge)
// — stored as jsonb so it can be extended without a migration; the match
// details view already knows how to render it when present.
export type MatchScore = {
  a: number;
  b: number;
  battles?: MatchBattle[];
  judgeName?: string;
  // @<handle> shown alongside judgeName in the match details narrative.
  judgeUsername?: string;
  // Count of *committed* penalties (every 2 penalty presses) charged to
  // each side — each one already added a point to the other side's `a`/`b`
  // total; kept separately since penalties aren't a FinishType and so
  // don't appear in `battles`.
  penaltiesA?: number;
  penaltiesB?: number;
  screenshotUrl?: string;
  confirmedByBoth?: boolean;
  inputBy?: "organizer" | "judge";
  // The stadium/station this match was played at (tournament_stations.name),
  // snapshotted at submit time — see submitJudgedMatchResult. A name, not a
  // station id, since a station can be renamed or removed later and the
  // result should still say where it actually happened.
  station?: string;
};

// Mirrors supabase/migrations/20250101000003_tournament_tables.sql's
// `brackets` table (now allowed more than one row per tournament, per
// 20250101000015_placement_brackets.sql) — currently only used for
// placement brackets ("3rd Place Match", "5th–8th Place Bracket", ...),
// one row per section. The main final-stage bracket still doesn't get a row
// here; its matches keep `bracket_id` null, same as always.
export type PlacementBracketStructure = {
  key: string;
  basePlace: number;
  poolSize: number;
  feederKey: string | null;
  feederRound: number;
};

export type Bracket = {
  id: string;
  tournament_id: string;
  format: BracketFormat;
  structure: PlacementBracketStructure;
  is_finalized: boolean;
  created_at: string;
  updated_at: string;
};

export type Match = {
  id: string;
  tournament_id: string;
  bracket_id: string | null;
  group_id: string | null;
  round: number;
  match_number: number;
  participant_a_id: string | null;
  participant_b_id: string | null;
  winner_id: string | null;
  score: MatchScore | Record<string, never>;
  status: MatchStatus;
  judge_id: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export interface TournamentListItem
  extends Pick<
    Tournament,
    | "id"
    | "title"
    | "slug"
    | "short_description"
    | "thumbnail_url"
    | "battle_type"
    | "tournament_type"
    | "status"
    | "starts_at"
    | "location_name"
    | "champion_name"
    | "view_count"
  > {
  organizer_name: string;
  community_name: string | null;
}

// Mirrors the `public.notification_type` Postgres enum — a plain `string`
// column type here would silently accept any value the app writes, but the
// DB itself only accepts these (see 20250101000026_notification_type_judge_events.sql,
// which added the last two — the app inserting an out-of-enum `type` fails
// the write outright, so a mismatch here is a real live bug, not a lint nit).
export type NotificationType = "tournament_update" | "registration" | "match_result" | "announcement" | "system" | "judge_invite" | "judge_response";

export type NotificationRow = {
  id: string;
  profile_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

// Real `communities` table shape (distinct from the denormalized `Community`
// above, which represents a joined/display-ready shape for the UI).
export type CommunityRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  province_id: string | null;
  is_premium: boolean;
  member_count: number;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  // Mirrors supabase/migrations/20250101000031_community_profile_fields.sql
  // — the Create Community form's own Location/Social Media sections. Free-
  // text `province` (not `province_id` above, unused by that form) mirrors
  // the same address_line/city/province/lat/lng shape the tournament wizard
  // settled on — see Tournament's own `province` field for why.
  headquarter_name: string | null;
  address_line: string | null;
  city: string | null;
  province: string | null;
  latitude: number | null;
  longitude: number | null;
  alt_logo_url: string | null;
  pin_logo_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  messenger_url: string | null;
  // Mirrors supabase/migrations/20250101000033_community_status_fields.sql.
  started_at: string | null;
  status: CommunityStatus;
  // Admin-only — the organizer's own Settings form never writes this (see
  // updateCommunity); only the admin approval page does.
  approval_status: CommunityApprovalStatus;
};

export type CommunityStatus = "active" | "inactive";
export type CommunityApprovalStatus = "pending" | "approved";

// Mirrors supabase/migrations/20250101000003_tournament_tables.sql's
// `organizers` table — co-organizer staff on a community (distinct from a
// tournament's own `organizer_id`, which is always the community's owner or
// an independent solo organizer). Nothing writes to this yet (no "invite a
// co-organizer" flow exists), but it's real and publicly selectable
// (organizers_select_all), so the Community Management page's "communities
// you own or help run" reads it for real — see
// app/account/organizer/community/page.tsx.
export type Organizer = {
  id: string;
  community_id: string;
  profile_id: string;
  role: string;
  created_at: string;
};

export type RegistrationStatus = "pending" | "confirmed" | "checked_in" | "withdrawn" | "disqualified";

// Mirrors supabase/migrations/20250101000003_tournament_tables.sql's
// `registrations` table — an account-bound "I'm registering for this
// tournament" record, distinct from `tournament_participants` (the
// free-typed roster a bracket's matches actually reference, with no link
// back to `profiles` at all — see 20250101000013_group_stage_matches.sql).
// Nothing writes to this yet (the real registration flow, `/tournaments/
// [slug]/register`, isn't built), so player-facing reads of it are live but
// will be empty until that ships.
export type Registration = {
  id: string;
  tournament_id: string;
  player_id: string;
  team_name: string | null;
  status: RegistrationStatus;
  checked_in_at: string | null;
  created_at: string;
  updated_at: string;
};

// Mirrors supabase/migrations/20250101000004_social_commerce_tables.sql —
// backs both the public /faqs page (published only) and its /backend CRUD.
export type Faq = {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type StaticPageSlug = "privacy-policy" | "terms-of-service" | "how-to-use";

// Mirrors supabase/migrations/20250101000037_backend_admin.sql — CMS
// content for the Privacy Policy / Terms / How to Use pages, edited from
// /backend and rendered on their matching public route.
export type StaticPage = {
  id: string;
  slug: StaticPageSlug;
  title: string;
  body: string;
  updated_at: string;
  updated_by: string | null;
};

// Mirrors supabase/migrations/20250101000038_beyblades.sql — the
// admin-managed parts catalog behind /backend/beyblades.
export type BeybladeType = "attack" | "balance" | "defense" | "stamina";

export type BeybladeSeries = "plastic_generation" | "metal_generation" | "burst_generation" | "x_generation";

export type BeybladeSystemLine = "basic_line" | "unique_line" | "custom_line";

// "blade" is the composite/assembled piece — only meaningful for
// system_line: 'custom_line', where it's built from the other
// component categories (lock_chip/main_blade/over_blade/metal_blade/
// assist_blade) via the *_id columns below. Every other category stands
// on its own.
export type BeybladeCategory =
  | "lock_chip"
  | "main_blade"
  | "over_blade"
  | "metal_blade"
  | "assist_blade"
  | "blade"
  | "ratchet_integrated_blade"
  | "ratchet"
  | "bit"
  | "ratchet_integrated_bit";

export type BeybladeSpinDirection = "right" | "left" | "dual";

export type Beyblade = {
  id: string;
  code: string;
  name: string;
  short_name: string;
  // Only meaningful for parts that spin as a whole blade on their own
  // (category 'blade'/'ratchet_integrated_blade') — null for Lock Chips,
  // Ratchets, and the other individual Custom Line components, which don't
  // have an attack/defense/balance/stamina lean or spin handedness of
  // their own. See 20250101000041_beyblades_type_spin_direction_optional.sql.
  type: BeybladeType | null;
  series: BeybladeSeries;
  system_line: BeybladeSystemLine;
  category: BeybladeCategory;
  spin_direction: BeybladeSpinDirection | null;
  attack: number | null;
  defense: number | null;
  stamina: number | null;
  height: number | null;
  dash: number | null;
  burst_resistance: number | null;
  description: string | null;
  // WebP, stored at `${id}/image.webp` in the `beyblade-images` bucket —
  // see 20250101000039_beyblade_images.sql.
  image_url: string | null;
  // Self-referencing "Blade" assembly — see BeybladeCategory above.
  lock_chip_id: string | null;
  main_blade_id: string | null;
  over_blade_id: string | null;
  metal_blade_id: string | null;
  assist_blade_id: string | null;
  expand_blade: boolean;
  created_at: string;
  updated_at: string;
};

// Mirrors supabase/migrations/20250101000042_beyblade_combos_and_decks.sql —
// a player's saved Blade+Ratchet+Bit loadouts and deck, behind
// /account/beyblade/*. Fully private (RLS: owning profile only), unlike
// the `beyblades` catalog itself.
export type BeybladeCombo = {
  id: string;
  profile_id: string;
  name: string;
  // Exactly one of blade_id or lock_chip_id (i.e. the assembly columns
  // below) is set per row — see
  // 20250101000045_beyblade_combos_custom_assembly.sql.
  blade_id: string | null;
  // null when blade_id or bit_id is itself a Ratchet-Integrated part — see
  // 20250101000044_beyblade_combos_ratchet_optional.sql.
  ratchet_id: string | null;
  bit_id: string;
  // A self-assembled Blade, in place of blade_id — see the migration
  // above. main_blade_id is used unless expand_blade, which uses
  // over_blade_id + metal_blade_id instead (mirrors beyblades' own Blade
  // Assembly columns, 20250101000038_beyblades.sql).
  lock_chip_id: string | null;
  main_blade_id: string | null;
  over_blade_id: string | null;
  metal_blade_id: string | null;
  assist_blade_id: string | null;
  expand_blade: boolean;
  created_at: string;
  updated_at: string;
};

export type BeybladeDeck = {
  id: string;
  profile_id: string;
  name: string;
  is_active: boolean;
  combo_1_id: string | null;
  combo_2_id: string | null;
  combo_3_id: string | null;
  created_at: string;
  updated_at: string;
};

type TableDef<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };

// Minimal Supabase Database type shape so `@supabase/ssr` generics compile
// without a full generated schema. Expand per-table once migrations run.
export interface Database {
  public: {
    Tables: {
      profiles: TableDef<Profile>;
      profile_roles: TableDef<ProfileRole>;
      profile_communities: TableDef<ProfileCommunity>;
      community_judges: TableDef<CommunityJudge>;
      sponsors: TableDef<Sponsor>;
      notifications: TableDef<NotificationRow>;
      communities: TableDef<CommunityRow>;
      organizers: TableDef<Organizer>;
      provinces: TableDef<Province>;
      tournaments: TableDef<Tournament>;
      registrations: TableDef<Registration>;
      tournament_groups: TableDef<TournamentGroup>;
      tournament_participants: TableDef<TournamentParticipant>;
      participant_links: TableDef<ParticipantLink>;
      tournament_prizes: TableDef<TournamentPrize>;
      matches: TableDef<Match>;
      brackets: TableDef<Bracket>;
      tournament_announcements: TableDef<TournamentAnnouncement>;
      tournament_stations: TableDef<TournamentStation>;
      judges: TableDef<Judge>;
      tournament_reports: TableDef<TournamentReport>;
      tournament_log_entries: TableDef<TournamentLogEntry>;
      tournament_preregistrations: TableDef<TournamentPreregistration>;
      faqs: TableDef<Faq>;
      static_pages: TableDef<StaticPage>;
      beyblades: TableDef<Beyblade>;
      beyblade_combos: TableDef<BeybladeCombo>;
      beyblade_decks: TableDef<BeybladeDeck>;
    };
    Views: {
      public_preregistrations: TableDef<PublicPreregistration>;
    };
    Functions: {
      // Mirrors supabase/migrations/20250101000051_google_username_generation.sql
      // — resolves a username to its account email so /login can accept
      // either (see signInWithPassword in app/(auth)/actions.ts).
      email_for_username: { Args: { p_username: string }; Returns: string | null };
    };
    Enums: {
      app_role: AppRole;
      role_status: RoleStatus;
      judge_assignment_status: JudgeAssignmentStatus;
      subscription_plan: SubscriptionPlan;
      notification_type: NotificationType;
    };
  };
}
