"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createCommunitySchema, type CreateCommunityInput } from "@/lib/validations/community";
import type { RoleActionState } from "@/lib/validations/roles";

// Owner-only, same as deleteCommunity (mirrors communities_update_owner_or_admin
// — a staff `organizers` row doesn't grant this). Logos aren't touched here;
// CommunityLogoSection uploads/reassigns those immediately via
// shared-actions.ts once this page has a real community id to work with.
// Deliberately never writes `approval_status` — that's admin-only (see
// app/backend/communities), regardless of what a tampered request
// might try to send here; the form itself doesn't even have a field for it.
export async function updateCommunity(
  communityId: string,
  slug: string,
  input: CreateCommunityInput
): Promise<RoleActionState & { slug?: string }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const parsed = createCommunitySchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors, message: "Check the highlighted fields." };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("communities")
    .update({
      name: data.name,
      slug: data.slug,
      headquarter_name: data.headquarterName.trim() || null,
      address_line: data.addressLine.trim() || null,
      city: data.city.trim() || null,
      province: data.province.trim() || null,
      latitude: data.latitude,
      longitude: data.longitude,
      facebook_url: data.facebookUrl.trim() || null,
      instagram_url: data.instagramUrl.trim() || null,
      youtube_url: data.youtubeUrl.trim() || null,
      messenger_url: data.messengerUrl.trim() || null,
      started_at: data.startedAt.trim() || null,
      status: data.status,
    })
    .eq("id", communityId)
    .eq("owner_id", user.id)
    .select("slug")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { status: "error", message: "That URL slug is already taken — try another." };
    }
    return { status: "error", message: error.message };
  }

  revalidatePath("/account/organizer/community");
  revalidatePath(`/account/organizer/community/${slug}/settings`);
  revalidatePath(`/communities/${updated.slug}`);
  return { status: "success", slug: updated.slug };
}
