"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createCommunitySchema, type CreateCommunityInput } from "@/lib/validations/community";
import type { RoleActionState } from "@/lib/validations/roles";

export async function createCommunity(input: CreateCommunityInput): Promise<RoleActionState & { id?: string; slug?: string }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in to create a community." };

  const parsed = createCommunitySchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors, message: "Check the highlighted fields." };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("communities")
    .insert({
      owner_id: user.id,
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
    })
    .select("id, slug")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { status: "error", message: "That URL slug is already taken — try another." };
    }
    return { status: "error", message: error.message };
  }

  return { status: "success", id: inserted.id, slug: inserted.slug };
}
