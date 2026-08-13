import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Profile, ProfileRole } from "@/lib/types/database";

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

export async function getCurrentUserRoles(): Promise<ProfileRole[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data } = await supabase.from("profile_roles").select("*").eq("profile_id", user.id);
  return (data as ProfileRole[] | null) ?? [];
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
