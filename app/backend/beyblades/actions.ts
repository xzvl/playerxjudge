"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { beybladeSchema, MAX_BEYBLADE_IMAGE_UPLOAD_BYTES, type BeybladeInput } from "@/lib/validations/beyblade";
import type { RoleActionState } from "@/lib/validations/roles";
import type { Beyblade } from "@/lib/types/database";
import type { BeybladeItem } from "@/components/backend/BeybladesPanel";

function revalidateBeybladePaths() {
  revalidatePath("/backend/beyblades");
}

function toRow(input: BeybladeInput) {
  const num = (v: string) => (v.trim() === "" ? null : Number(v));
  const ref = (v: string) => (v.trim() === "" ? null : v);
  // Keeps the literal union (vs. ref's plain `string | null`) so this still
  // matches the `type`/`spin_direction` columns' narrow types.
  const typeOrNull = (v: BeybladeInput["type"]) => (v === "" ? null : v);
  const spinOrNull = (v: BeybladeInput["spinDirection"]) => (v === "" ? null : v);
  return {
    name: input.name.trim(),
    short_name: input.shortName.trim(),
    code: input.code.trim(),
    type: typeOrNull(input.type),
    spin_direction: spinOrNull(input.spinDirection),
    attack: num(input.attack),
    defense: num(input.defense),
    stamina: num(input.stamina),
    height: num(input.height),
    dash: num(input.dash),
    burst_resistance: num(input.burstResistance),
    description: input.description.trim() || null,
    series: input.series,
    system_line: input.systemLine,
    category: input.category,
    expand_blade: input.expandBlade,
    lock_chip_id: ref(input.lockChipId),
    main_blade_id: ref(input.mainBladeId),
    over_blade_id: ref(input.overBladeId),
    metal_blade_id: ref(input.metalBladeId),
    assist_blade_id: ref(input.assistBladeId),
  };
}

export interface BeybladeActionState extends RoleActionState {
  id?: string;
}

export async function createBeyblade(input: BeybladeInput): Promise<BeybladeActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const parsed = beybladeSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Check the highlighted fields." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("beyblades").insert(toRow(parsed.data)).select("id").single();
  if (error) return { status: "error", message: error.message };

  revalidateBeybladePaths();
  return { status: "success", id: (data as { id: string }).id };
}

export async function updateBeyblade(id: string, input: BeybladeInput): Promise<BeybladeActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const parsed = beybladeSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Check the highlighted fields." };

  const supabase = await createClient();
  const { error } = await supabase.from("beyblades").update(toRow(parsed.data)).eq("id", id);
  if (error) return { status: "error", message: error.message };

  revalidateBeybladePaths();
  return { status: "success", id };
}

// Stored as `${id}/image.webp` in the public `beyblade-images` bucket —
// callable as soon as the row exists: immediately from the edit page, or
// right after creation from the new-beyblade form (the file is held in
// memory and only uploaded once a real id comes back — see BeybladeForm).
export async function uploadBeybladeImage(id: string, formData: FormData): Promise<RoleActionState & { url?: string }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { status: "error", message: "No file provided." };
  if (file.type !== "image/webp") return { status: "error", message: "Image must be converted to WebP before upload." };
  if (file.size > MAX_BEYBLADE_IMAGE_UPLOAD_BYTES) return { status: "error", message: "Image is too large." };

  const supabase = await createClient();
  const path = `${id}/image.webp`;

  const { error: uploadError } = await supabase.storage
    .from("beyblade-images")
    .upload(path, file, { upsert: true, contentType: "image/webp" });
  if (uploadError) return { status: "error", message: uploadError.message };

  const { data: publicUrlData } = supabase.storage.from("beyblade-images").getPublicUrl(path);
  const url = `${publicUrlData.publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase.from("beyblades").update({ image_url: url }).eq("id", id);
  if (updateError) return { status: "error", message: updateError.message };

  revalidateBeybladePaths();
  return { status: "success", url };
}

export interface DuplicateBeybladeResult extends BeybladeActionState {
  item?: BeybladeItem;
}

// Copies every field (stats, description, Blade-assembly references) plus
// the image onto a new row — `code` isn't unique (20250101000040_...), so
// it's copied as-is; `name` gets a "(Copy)" suffix so the duplicate is
// distinguishable in the list until it's renamed.
export async function duplicateBeyblade(id: string): Promise<DuplicateBeybladeResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { data: sourceData, error: fetchError } = await supabase.from("beyblades").select("*").eq("id", id).maybeSingle();
  if (fetchError) return { status: "error", message: fetchError.message };
  if (!sourceData) return { status: "error", message: "That beyblade no longer exists." };
  const source = sourceData as Beyblade;

  const name = `${source.name} (Copy)`;
  const { data: inserted, error: insertError } = await supabase
    .from("beyblades")
    .insert({
      name,
      short_name: source.short_name,
      code: source.code,
      type: source.type,
      spin_direction: source.spin_direction,
      attack: source.attack,
      defense: source.defense,
      stamina: source.stamina,
      height: source.height,
      dash: source.dash,
      burst_resistance: source.burst_resistance,
      description: source.description,
      series: source.series,
      system_line: source.system_line,
      category: source.category,
      expand_blade: source.expand_blade,
      lock_chip_id: source.lock_chip_id,
      main_blade_id: source.main_blade_id,
      over_blade_id: source.over_blade_id,
      metal_blade_id: source.metal_blade_id,
      assist_blade_id: source.assist_blade_id,
    })
    .select("id")
    .single();
  if (insertError) return { status: "error", message: insertError.message };
  const newId = (inserted as { id: string }).id;

  // The image copy isn't fatal if it fails — the duplicate still exists,
  // just without an image, same as any beyblade nothing's been uploaded to
  // yet (the admin can re-upload from the edit page).
  let imageUrl: string | null = null;
  if (source.image_url) {
    const { error: copyError } = await supabase.storage.from("beyblade-images").copy(`${id}/image.webp`, `${newId}/image.webp`);
    if (!copyError) {
      const { data: publicUrlData } = supabase.storage.from("beyblade-images").getPublicUrl(`${newId}/image.webp`);
      imageUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;
      await supabase.from("beyblades").update({ image_url: imageUrl }).eq("id", newId);
    }
  }

  revalidateBeybladePaths();
  return {
    status: "success",
    id: newId,
    item: {
      id: newId,
      code: source.code,
      name,
      shortName: source.short_name,
      type: source.type,
      systemLine: source.system_line,
      category: source.category,
      spinDirection: source.spin_direction,
      attack: source.attack,
      defense: source.defense,
      stamina: source.stamina,
      height: source.height,
      dash: source.dash,
      burstResistance: source.burst_resistance,
      description: source.description,
      series: source.series,
      imageUrl,
    },
  };
}

export async function deleteBeyblade(id: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("beyblades").delete().eq("id", id);
  if (error) return { status: "error", message: error.message };

  revalidateBeybladePaths();
  return { status: "success" };
}
