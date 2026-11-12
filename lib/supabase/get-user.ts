import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Profile, ProfileRole } from "@/lib/types/database";
import type { NavUser } from "@/components/layout/ProfileMenu";

// Every helper here is wrapped in React's cache(): the root layout, the
// dashboard layouts and the page itself all ask for the same "who's signed
// in / their roles / their unread count" within one request, and cache()
// collapses those into one query each (scoped to the request, so nothing
// leaks between visitors).

// The signed-in user, as the fields the app actually reads.
export interface CurrentUser {
  id: string;
  email: string | null;
  user_metadata: Record<string, unknown>;
  app_metadata: Record<string, unknown>;
}

// getClaims() verifies the session's access token locally against the
// project's cached public signing key (ES256), so this costs no Auth
// server round trip (the old getUser() call paid one on every request).
// The middleware has already refreshed the session cookie for this request.
// Claims carry user_metadata as of token issue; the app only writes
// metadata at sign-up, so that's the same data getUser() returned.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;

  return {
    id: claims.sub,
    email: (claims.email as string | undefined) ?? null,
    user_metadata: (claims.user_metadata as Record<string, unknown> | undefined) ?? {},
    app_metadata: (claims.app_metadata as Record<string, unknown> | undefined) ?? {},
  };
});

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return (data as Profile | null) ?? null;
});

// Mirrors the Postgres `is_admin()` helper (role in ('admin', 'super_admin'))
// — the app-layer check for gating things like app/account/admin, since
// there's no in-app admin role-request flow the way organizer/judge/sponsor
// have (see profile_roles) — a profile's `role` is a platform-level column,
// not something anyone can self-apply for.
export function isAdminProfile(profile: Profile | null): boolean {
  return profile?.role === "admin" || profile?.role === "super_admin";
}

// Mirrors the Postgres `is_admin_or_manager()` helper
// (20250101000008_role_approvals.sql) — the app-layer gate for /backend.
// That function checks `profile_roles.role in ('admin', 'manager')`, i.e.
// an approved `profile_roles` row of *either* kind counts as staff — not
// just manager. isAdminProfile additionally covers the `profiles.role`
// platform column.
export function isStaffProfile(profile: Profile | null, roles: ProfileRole[]): boolean {
  return isAdminProfile(profile) || roles.some((r) => (r.role === "manager" || r.role === "admin") && r.status === "approved");
}

export const getCurrentUserRoles = cache(async (): Promise<ProfileRole[]> => {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data } = await supabase.from("profile_roles").select("*").eq("profile_id", user.id);
  return (data as ProfileRole[] | null) ?? [];
});

// One-call convenience over isStaffProfile for server actions that need to
// decide "is the caller staff" without a profile/roles pair already in
// scope — see the owner-or-staff actions in
// app/account/organizer/tournament/[slug]/{actions,matches-actions}.ts,
// reused (not duplicated) by /backend/tournaments/[slug].
export async function isCurrentUserStaff(): Promise<boolean> {
  const [profile, roles] = await Promise.all([getCurrentProfile(), getCurrentUserRoles()]);
  return isStaffProfile(profile, roles);
}

// Backs the "Community/Individual" line under the player's name in the
// navs — profiles.community_id is the "main community" a player picked in
// Account Settings, distinct from profile_communities (their full,
// possibly-pending membership list). None picked reads as "Individual".
export const getCurrentUserCommunityName = cache(async (): Promise<string | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  // profiles has two FKs to communities (profiles.community_id for this
  // "home community" lookup, and communities.owner_id); disambiguate.
  const { data } = await supabase
    .from("profiles")
    .select("communities!profiles_community_id_fkey(name)")
    .eq("id", user.id)
    .single();
  return (data as unknown as { communities: { name: string } | null } | null)?.communities?.name ?? null;
});

// Assembles the NavUser object every header needs, so the same
// displayName/avatar fallback logic doesn't drift across call sites.
export function buildNavUser(
  authUser: { email?: string | null; user_metadata?: Record<string, unknown> | null },
  roles: readonly ProfileRole[],
  communityName: string | null
): NavUser {
  return {
    email: authUser.email ?? null,
    displayName:
      (authUser.user_metadata?.display_name as string | undefined) ??
      authUser.email?.split("@")[0] ??
      "Player",
    avatarUrl: (authUser.user_metadata?.avatar_url as string | undefined) ?? null,
    isOrganizer: roles.some((r) => r.role === "organizer" && r.status === "approved"),
    communityName,
  };
}

// Backs the header bell's badge count (Header.tsx, PlayerViewHeaderActions).
export const getUnreadNotificationCount = cache(async (): Promise<number> => {
  const user = await getCurrentUser();
  if (!user) return 0;

  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", user.id)
    .eq("is_read", false);
  return count ?? 0;
});

export interface ShellData {
  user: CurrentUser;
  roles: ProfileRole[];
  notificationCount: number;
  communityName: string | null;
  navUser: NavUser;
}

// Everything a dashboard shell (and the root layout's header) needs, in
// one parallel batch: one auth check, then roles + unread count + community
// together, instead of the layouts' old auth → roles → (count, community)
// chain. Shared through cache(), so the root layout and a dashboard layout
// rendering in the same request pay for it once.
export const getShellData = cache(async (): Promise<ShellData | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const [roles, notificationCount, communityName] = await Promise.all([
    getCurrentUserRoles(),
    getUnreadNotificationCount(),
    getCurrentUserCommunityName(),
  ]);
  return { user, roles, notificationCount, communityName, navUser: buildNavUser(user, roles, communityName) };
});
