// Hand-authored types mirroring supabase/migrations/*.sql.
// Once a live Supabase project exists, replace with generated types via:
//   npx supabase gen types typescript --project-id <id> > lib/types/database.ts

export type UserRole =
  | "guest"
  | "player"
  | "judge"
  | "organizer"
  | "sponsor"
  | "admin"
  | "super_admin";

export type SubscriptionPlan = "free" | "premium";

export type BattleType = "solo" | "2v2" | "3v3" | "4v4" | "5v5";

export type TournamentType = "casual" | "minor" | "major" | "emergency";

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

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  country: string | null;
  province: string | null;
  city: string | null;
  community_id: string | null;
  favorite_beyblade: string | null;
  bio: string | null;
  social_links: Record<string, string> | null;
  role: UserRole;
  subscription_plan: SubscriptionPlan;
  created_at: string;
}

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

export interface Tournament {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  thumbnail_url: string | null;
  battle_type: BattleType;
  tournament_type: TournamentType;
  status: TournamentStatus;
  starts_at: string;
  ends_at: string | null;
  location_name: string;
  latitude: number | null;
  longitude: number | null;
  province: string;
  community_id: string | null;
  organizer_id: string;
  prize_pool: number | null;
  entry_fee: number | null;
  max_participants: number | null;
  bracket_format: BracketFormat;
  view_count: number;
  champion_name: string | null;
  created_at: string;
}

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
    | "province"
    | "champion_name"
    | "view_count"
  > {
  organizer_name: string;
  community_name: string | null;
}

// Minimal Supabase Database type shape so `@supabase/ssr` generics compile
// without a full generated schema. Expand per-table once migrations run.
export interface Database {
  public: {
    Tables: Record<string, { Row: Record<string, unknown> }>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      subscription_plan: SubscriptionPlan;
    };
  };
}
