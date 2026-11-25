"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { getUserCombo, type ComboWithParts } from "@/app/account/beyblade/data";
import {
  beybladeComboSchema,
  COMBO_VARIATION_SLOTS,
  type BeybladeComboInput,
  type ComboVariationSlot,
} from "@/lib/validations/beyblade-combo";
import type { RoleActionState } from "@/lib/validations/roles";

function revalidateBeybladeAccountPaths() {
  revalidatePath("/account/beyblade/dashboard");
  revalidatePath("/account/beyblade/deck");
  revalidatePath("/account/beyblade/deck/[id]", "page");
  revalidatePath("/account/beyblade/combos");
}

export interface ComboActionState extends RoleActionState {
  id?: string;
}

// Exactly one of blade_id or the assembly columns is written per
// bladeMode — see 20250101000045_beyblade_combos_custom_assembly.sql's
// XOR check constraint.
// Only the variations that are real variations of the part actually in
// their slot (a slot not in use for this blade mode, or a variation of a
// different part, is dropped).
async function variationColumn(supabase: Awaited<ReturnType<typeof createClient>>, data: BeybladeComboInput): Promise<Record<string, string>> {
  const partFor = (slot: ComboVariationSlot): string => {
    if (slot === "blade" && data.bladeMode !== "existing") return "";
    if (slot !== "blade" && slot !== "ratchet" && slot !== "bit" && data.bladeMode !== "custom") return "";
    if (slot === "mainBlade" && data.expandBlade) return "";
    if ((slot === "metalBlade" || slot === "overBlade") && !data.expandBlade) return "";
    return data[COMBO_VARIATION_SLOTS[slot]].trim();
  };

  const wanted = (Object.keys(COMBO_VARIATION_SLOTS) as ComboVariationSlot[])
    .map((slot) => ({ slot, partId: partFor(slot), variationId: (data.variations?.[slot] ?? "").trim() }))
    .filter((w) => w.partId && /^[0-9a-f-]{36}$/i.test(w.variationId));
  if (wanted.length === 0) return {};

  const { data: rows } = await supabase
    .from("beyblade_variations")
    .select("id, beyblade_id")
    .in(
      "id",
      wanted.map((w) => w.variationId)
    );
  const owner = new Map(((rows as { id: string; beyblade_id: string }[] | null) ?? []).map((r) => [r.id, r.beyblade_id]));
  return Object.fromEntries(wanted.filter((w) => owner.get(w.variationId) === w.partId).map((w) => [w.slot, w.variationId]));
}

function bladeColumns(data: BeybladeComboInput) {
  if (data.bladeMode === "custom") {
    return {
      blade_id: null,
      lock_chip_id: data.lockChipId.trim() || null,
      main_blade_id: data.mainBladeId.trim() || null,
      over_blade_id: data.overBladeId.trim() || null,
      metal_blade_id: data.metalBladeId.trim() || null,
      assist_blade_id: data.assistBladeId.trim() || null,
      expand_blade: data.expandBlade,
    };
  }
  return {
    blade_id: data.bladeId.trim() || null,
    lock_chip_id: null,
    main_blade_id: null,
    over_blade_id: null,
    metal_blade_id: null,
    assist_blade_id: null,
    expand_blade: false,
  };
}

export async function createCombo(input: BeybladeComboInput): Promise<ComboActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const parsed = beybladeComboSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Check the highlighted fields." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("beyblade_combos")
    .insert({
      profile_id: user.id,
      name: parsed.data.name.trim(),
      ...bladeColumns(parsed.data),
      ratchet_id: parsed.data.ratchetId.trim() || null,
      bit_id: parsed.data.bitId,
      variations: await variationColumn(supabase, parsed.data),
    })
    .select("id")
    .single();
  if (error) return { status: "error", message: error.message };

  revalidateBeybladeAccountPaths();
  return { status: "success", id: (data as { id: string }).id };
}

export interface CreateComboResult extends ComboActionState {
  combo?: ComboWithParts;
}

// Same as createCombo, but hands back the full resolved combo (images,
// stats, blade roles, ...) instead of just its id — used when a caller
// needs to render the new combo immediately without a page reload, e.g.
// the deck part-conflict "force assign" flow (AssignComboDialog), which
// creates a substitute combo and then has to show/assign it right away.
export async function createComboAndFetch(input: BeybladeComboInput): Promise<CreateComboResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const result = await createCombo(input);
  if (result.status === "error" || !result.id) return result;

  const combo = await getUserCombo(result.id, user.id);
  return { ...result, combo: combo ?? undefined };
}

export async function updateCombo(id: string, input: BeybladeComboInput): Promise<ComboActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const parsed = beybladeComboSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Check the highlighted fields." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("beyblade_combos")
    .update({
      name: parsed.data.name.trim(),
      ...bladeColumns(parsed.data),
      ratchet_id: parsed.data.ratchetId.trim() || null,
      bit_id: parsed.data.bitId,
      variations: await variationColumn(supabase, parsed.data),
    })
    .eq("id", id)
    .eq("profile_id", user.id);
  if (error) return { status: "error", message: error.message };

  revalidateBeybladeAccountPaths();
  return { status: "success", id };
}

export async function deleteCombo(id: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("beyblade_combos").delete().eq("id", id).eq("profile_id", user.id);
  if (error) return { status: "error", message: error.message };

  revalidateBeybladeAccountPaths();
  return { status: "success" };
}

// slot: which of the deck's 3 fixed columns (combo_1_id/combo_2_id/
// combo_3_id) to set — see 20250101000042_beyblade_combos_and_decks.sql.
// comboId: null clears the slot.
export async function setDeckSlot(deckId: string, slot: 1 | 2 | 3, comboId: string | null): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const patch =
    slot === 1 ? { combo_1_id: comboId } : slot === 2 ? { combo_2_id: comboId } : { combo_3_id: comboId };

  const supabase = await createClient();
  const { error } = await supabase.from("beyblade_decks").update(patch).eq("id", deckId).eq("profile_id", user.id);
  if (error) return { status: "error", message: error.message };

  revalidateBeybladeAccountPaths();
  return { status: "success" };
}

// Makes `deckId` the profile's one active deck. Deactivates whatever's
// currently active first — a partial unique index only allows one active
// deck per profile at a time (20250101000043_beyblade_decks_one_active.sql),
// and doing it in this order (false, then true) never has both this deck
// and the old one active at once, so it can't trip that constraint.
export async function setActiveDeck(deckId: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error: deactivateError } = await supabase
    .from("beyblade_decks")
    .update({ is_active: false })
    .eq("profile_id", user.id)
    .eq("is_active", true)
    .neq("id", deckId);
  if (deactivateError) return { status: "error", message: deactivateError.message };

  const { error } = await supabase.from("beyblade_decks").update({ is_active: true }).eq("id", deckId).eq("profile_id", user.id);
  if (error) return { status: "error", message: error.message };

  revalidateBeybladeAccountPaths();
  return { status: "success" };
}

export async function renameDeck(deckId: string, name: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const trimmed = name.trim();
  if (!trimmed) return { status: "error", message: "Name can't be empty." };
  if (trimmed.length > 60) return { status: "error", message: "Name is too long." };

  const supabase = await createClient();
  const { error } = await supabase.from("beyblade_decks").update({ name: trimmed }).eq("id", deckId).eq("profile_id", user.id);
  if (error) return { status: "error", message: error.message };

  revalidateBeybladeAccountPaths();
  return { status: "success" };
}

// Hard cap so a profile can't create decks without bound.
const MAX_DECKS = 20;

export interface CreateDeckResult extends RoleActionState {
  id?: string;
}

// Adds one more deck (3 empty combo slots) to the profile. The first deck a
// profile ever has is active; later ones start inactive.
export async function createDeck(name?: string): Promise<CreateDeckResult> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { data: existing, error: listError } = await supabase.from("beyblade_decks").select("name").eq("profile_id", user.id);
  if (listError) return { status: "error", message: listError.message };
  const names = new Set((existing ?? []).map((d) => (d as { name: string }).name));
  if (names.size >= MAX_DECKS) return { status: "error", message: `You can have up to ${MAX_DECKS} decks.` };

  let finalName = name?.trim() ?? "";
  if (finalName.length > 60) return { status: "error", message: "Name is too long." };
  if (!finalName) {
    // "Deck A", "Deck B", … first unused letter, then "Deck 27"+.
    let i = 0;
    do {
      finalName = i < 26 ? `Deck ${String.fromCharCode(65 + i)}` : `Deck ${i + 1}`;
      i++;
    } while (names.has(finalName));
  }

  const { data, error } = await supabase
    .from("beyblade_decks")
    .insert({ profile_id: user.id, name: finalName, is_active: (existing ?? []).length === 0 })
    .select("id")
    .single();
  if (error) return { status: "error", message: error.message };

  revalidateBeybladeAccountPaths();
  return { status: "success", id: (data as { id: string }).id };
}

// Deletes a deck. A profile always keeps at least one; deleting the active
// deck hands "active" to the oldest remaining one.
export async function deleteDeck(deckId: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { data } = await supabase
    .from("beyblade_decks")
    .select("id, is_active")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true });
  const decks = (data ?? []) as { id: string; is_active: boolean }[];
  const target = decks.find((d) => d.id === deckId);
  if (!target) return { status: "error", message: "Deck not found." };
  if (decks.length <= 1) return { status: "error", message: "You need to keep at least one deck." };

  const { error } = await supabase.from("beyblade_decks").delete().eq("id", deckId).eq("profile_id", user.id);
  if (error) return { status: "error", message: error.message };

  if (target.is_active) {
    const next = decks.find((d) => d.id !== deckId);
    if (next) await supabase.from("beyblade_decks").update({ is_active: true }).eq("id", next.id).eq("profile_id", user.id);
  }

  revalidateBeybladeAccountPaths();
  return { status: "success" };
}
