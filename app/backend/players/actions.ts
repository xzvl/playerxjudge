"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import type { RoleActionState } from "@/lib/validations/roles";

// Player "remove" = ban/suspend, not account deletion — a banned account
// can't sign in (app/(auth)/actions.ts's signInWithPassword) and gets
// signed out of any live session on its next protected-route request
// (lib/supabase/middleware.ts). Reversible via Unban. RLS
// ("profiles_update_own_or_admin") is admin-only for this column's
// purposes in practice — a manager can technically call it too since the
// policy doesn't distinguish, same as any other profiles update.
export async function setPlayerBanned(profileId: string, banned: boolean): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };
  if (profileId === user.id) return { status: "error", message: "You can't ban your own account." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ is_banned: banned }).eq("id", profileId);
  if (error) return { status: "error", message: error.message };

  revalidatePath("/backend/players");
  return { status: "success" };
}
