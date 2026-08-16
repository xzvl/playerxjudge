"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { beybladeSchema, DEFAULT_BEYBLADE_VALUES, MAX_BEYBLADE_IMAGE_UPLOAD_BYTES, type BeybladeInput } from "@/lib/validations/beyblade";
import type { RoleActionState } from "@/lib/validations/roles";

function revalidateBeybladePaths() {
  revalidatePath("/backend/beyblades");
}

function toRow(input: BeybladeInput) {
  const num = (v: string) => (v.trim() === "" ? null : Number(v));
  const ref = (v: string) => (v.trim() === "" ? null : v);
  return {
    name: input.name.trim(),
    short_name: input.shortName.trim(),
    code: input.code.trim(),
    type: input.type,
    spin_direction: input.spinDirection,
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

function messageFor(error: { code?: string; message: string }): string {
  return error.code === "23505" ? "That code is already in use." : error.message;
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
  if (error) return { status: "error", message: messageFor(error) };

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
  if (error) return { status: "error", message: messageFor(error) };

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

export async function deleteBeyblade(id: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("beyblades").delete().eq("id", id);
  if (error) return { status: "error", message: error.message };

  revalidateBeybladePaths();
  return { status: "success" };
}

export interface BulkAddedBeyblade {
  id: string;
  code: string;
  name: string;
  shortName: string;
  type: BeybladeInput["type"];
  systemLine: BeybladeInput["systemLine"];
  category: BeybladeInput["category"];
}

export interface BulkAddResult extends RoleActionState {
  added: BulkAddedBeyblade[];
  failed: { line: number; reason: string }[];
}

const BULK_HEADER = ["code", "name", "short_name", "type", "series", "system_line", "category", "spin_direction"];

// One beyblade per line, comma-separated in BULK_HEADER's order. A header
// row (case-insensitive, matching BULK_HEADER) is optional and skipped if
// present. Stats/description/the Blade-assembly pickers aren't supported
// here — bulk add is for seeding a batch of catalog entries quickly; open
// any of them from the list afterward to fill in the rest.
export async function bulkAddBeyblades(csv: string): Promise<BulkAddResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in.", added: [], failed: [] };

  const lines = csv
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return { status: "error", message: "Paste at least one row.", added: [], failed: [] };

  const firstCells = lines[0].split(",").map((c) => c.trim().toLowerCase());
  const dataLines = firstCells.join(",") === BULK_HEADER.join(",") ? lines.slice(1) : lines;

  const rows: ReturnType<typeof toRow>[] = [];
  const failed: { line: number; reason: string }[] = [];

  dataLines.forEach((line, i) => {
    const [code, name, shortName, type, series, systemLine, category, spinDirection] = line.split(",").map((c) => c.trim());
    const parsed = beybladeSchema.safeParse({
      ...DEFAULT_BEYBLADE_VALUES,
      code: code ?? "",
      name: name ?? "",
      shortName: shortName ?? "",
      type: type ?? "",
      series: series || "x_generation",
      systemLine: systemLine ?? "",
      category: category ?? "",
      spinDirection: spinDirection ?? "",
    });
    if (!parsed.success) {
      failed.push({ line: i + 1, reason: parsed.error.issues[0]?.message ?? "Invalid row" });
      return;
    }
    rows.push(toRow(parsed.data));
  });

  if (rows.length === 0) return { status: "error", message: "No valid rows to add.", added: [], failed };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("beyblades")
    .insert(rows)
    .select("id, code, name, short_name, type, system_line, category");
  if (error) return { status: "error", message: messageFor(error), added: [], failed };

  const added: BulkAddedBeyblade[] = (
    (data as { id: string; code: string; name: string; short_name: string; type: string; system_line: string; category: string }[] | null) ?? []
  ).map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    shortName: r.short_name,
    type: r.type as BeybladeInput["type"],
    systemLine: r.system_line as BeybladeInput["systemLine"],
    category: r.category as BeybladeInput["category"],
  }));

  revalidateBeybladePaths();
  return {
    status: failed.length > 0 ? "error" : "success",
    added,
    failed,
    message: failed.length > 0 ? `Added ${added.length}, ${failed.length} row(s) failed.` : undefined,
  };
}
