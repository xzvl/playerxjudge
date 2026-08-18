import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Profile, ProfileRole } from "@/lib/types/database";
import type { NavUser } from "@/components/layout/ProfileMenu";

export async function getCurrentUser() {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return (data as Profile | null) ?? null;
}

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
// just manager. This previously only checked for 'manager' here and relied
// on isAdminProfile (the `profiles.role` platform column) to catch the
// admin case, which silently locks out an account admin'd only via
// `profile_roles` (e.g. on a database where `profiles.role` doesn't exist
// at all — see the /backend access investigation this fixes).
export function isStaffProfile(profile: Profile | null, roles: ProfileRole[]): boolean {
  return isAdminProfile(profile) || roles.some((r) => (r.role === "manager" || r.role === "admin") && r.status === "approved");
}

export async function getCurrentUserRoles(): Promise<ProfileRole[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data } = await supabase.from("profile_roles").select("*").eq("profile_id", user.id);
  return (data as ProfileRole[] | null) ?? [];
}

// One-call convenience over isStaffProfile for server actions that need to
// decide "is the caller staff" without a profile/roles pair already in
// scope — see the owner-or-staff actions in
// app/account/organizer/tournament/[slug]/{actions,matches-actions}.ts,
// reused (not duplicated) by /backend/tournaments/[slug].
export async function isCurrentUserStaff(): Promise<boolean> {
  const [profile, roles] = await Promise.all([getCurrentProfile(), getCurrentUserRoles()]);
  return isStaffProfile(profile, roles);
}

// Backs the mobile nav's "Community/Individual" line under the player's
// name (Header.tsx) — profiles.community_id is the "main community" a
// player picked in Account Settings (see app/account/settings/actions.ts),
// distinct from profile_communities (their full, possibly-pending
// membership list). No community picked at all reads as "Individual".
export async function getCurrentUserCommunityName(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  // communities(...) alone is ambiguous — profiles has two FKs to
  // communities (profiles.community_id for this "home community" lookup,
  // and communities.owner_id); disambiguate to the former.
  const { data } = await supabase
    .from("profiles")
    .select("communities!profiles_community_id_fkey(name)")
    .eq("id", user.id)
    .single();
  return (data as unknown as { communities: { name: string } | null } | null)?.communities?.name ?? null;
}

// Assembles the NavUser object every header (the global Header, and now
// every /account layout's own standalone DashboardShell header) needs —
// pulled out so the same displayName/avatar fallback logic doesn't drift
// across call sites. Takes the auth user and roles as params rather than
// fetching them itself since callers (RootLayout, the /account layouts)
// already need both for other reasons and would otherwise re-fetch them.
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

// Backs the header bell's badge count — see components/layout/Header.tsx
// and PlayerViewHeaderActions, both of which show it next to the bell icon.
export async function getUnreadNotificationCount(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;

  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", user.id)
    .eq("is_read", false);
  return count ?? 0;
}
