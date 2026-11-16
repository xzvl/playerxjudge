"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { isCurrentUserStaff } from "@/lib/supabase/get-user";
import { MAX_BEYBLADE_IMAGE_UPLOAD_BYTES } from "@/lib/validations/beyblade";
import type { BeybladeVariation } from "@/lib/types/database";
import { queueImageVariants } from "@/lib/images/optimize";

// Variations of one catalog part (colorways, editions, promos). Each has a
// name, where it came from, and an image stored in the existing
// `beyblade-images` bucket at `${beybladeId}/variations/${variationId}.webp`.
// RLS ("beyblade_variations_write_staff") is the real gate; the staff check
// here just gives a clear message.

export interface VariationInput {
  name: string;
  source: string;
}

export interface VariationActionState {
  status: "success" | "error";
  message?: string;
  variation?: BeybladeVariation;
}

const fail = (message: string): VariationActionState => ({ status: "error", message });

function clean(input: VariationInput): { name: string; source: string | null } | string {
  const name = input.name.trim();
  const source = input.source.trim();
  if (!name) return "Name is required.";
  if (name.length > 120) return "Name must be 120 characters or fewer.";
  if (source.length > 200) return "Came from must be 200 characters or fewer.";
  return { name, source: source || null };
}

function revalidate(beybladeId: string) {
  revalidatePath("/backend/beyblades");
  revalidatePath(`/backend/beyblades/${beybladeId}`);
}

export async function createVariation(beybladeId: string, input: VariationInput): Promise<VariationActionState> {
  if (!(await isCurrentUserStaff())) return fail("Only staff can edit the catalog.");
  const values = clean(input);
  if (typeof values === "string") return fail(values);

  const supabase = await createClient();
  const { count } = await supabase
    .from("beyblade_variations")
    .select("id", { count: "exact", head: true })
    .eq("beyblade_id", beybladeId);

  const { data, error } = await supabase
    .from("beyblade_variations")
    .insert({ beyblade_id: beybladeId, ...values, sort_order: count ?? 0 })
    .select("*")
    .single();
  if (error) return fail(error.message);

  revalidate(beybladeId);
  return { status: "success", variation: data as BeybladeVariation };
}

export async function updateVariation(id: string, input: VariationInput): Promise<VariationActionState> {
  if (!(await isCurrentUserStaff())) return fail("Only staff can edit the catalog.");
  const values = clean(input);
  if (typeof values === "string") return fail(values);

  const supabase = await createClient();
  const { data, error } = await supabase.from("beyblade_variations").update(values).eq("id", id).select("*").single();
  if (error) return fail(error.message);

  const variation = data as BeybladeVariation;
  revalidate(variation.beyblade_id);
  return { status: "success", variation };
}

export async function deleteVariation(id: string): Promise<VariationActionState> {
  if (!(await isCurrentUserStaff())) return fail("Only staff can edit the catalog.");

  const supabase = await createClient();
  const { data: row } = await supabase.from("beyblade_variations").select("beyblade_id").eq("id", id).maybeSingle();
  const beybladeId = (row as { beyblade_id: string } | null)?.beyblade_id;
  if (!beybladeId) return fail("That variation no longer exists.");

  const { error } = await supabase.from("beyblade_variations").delete().eq("id", id);
  if (error) return fail(error.message);

  // Best effort: an orphaned image file is harmless.
  await supabase.storage.from("beyblade-images").remove([`${beybladeId}/variations/${id}.webp`]);

  revalidate(beybladeId);
  return { status: "success" };
}

export async function saveVariationOrder(beybladeId: string, orderedIds: string[]): Promise<VariationActionState> {
  if (!(await isCurrentUserStaff())) return fail("Only staff can edit the catalog.");

  const supabase = await createClient();
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("beyblade_variations").update({ sort_order: index }).eq("id", id).eq("beyblade_id", beybladeId)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return fail(failed.error.message);

  revalidate(beybladeId);
  return { status: "success" };
}

export async function uploadVariationImage(id: string, formData: FormData): Promise<VariationActionState> {
  if (!(await isCurrentUserStaff())) return fail("Only staff can edit the catalog.");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("No file provided.");
  if (file.type !== "image/webp") return fail("Image must be converted to WebP before upload.");
  if (file.size > MAX_BEYBLADE_IMAGE_UPLOAD_BYTES) return fail("Image is too large.");

  const supabase = await createClient();
  const { data: row } = await supabase.from("beyblade_variations").select("beyblade_id").eq("id", id).maybeSingle();
  const beybladeId = (row as { beyblade_id: string } | null)?.beyblade_id;
  if (!beybladeId) return fail("That variation no longer exists.");

  const path = `${beybladeId}/variations/${id}.webp`;
  const { error: uploadError } = await supabase.storage
    .from("beyblade-images")
    .upload(path, file, { upsert: true, contentType: "image/webp" });
  if (uploadError) return fail(uploadError.message);
  queueImageVariants("beyblade-images", path);

  const { data: publicUrlData } = supabase.storage.from("beyblade-images").getPublicUrl(path);
  const url = `${publicUrlData.publicUrl}?v=${Date.now()}`;

  const { data, error } = await supabase.from("beyblade_variations").update({ image_url: url }).eq("id", id).select("*").single();
  if (error) return fail(error.message);

  revalidate(beybladeId);
  return { status: "success", variation: data as BeybladeVariation };
}
