import { createClient } from "@/lib/supabase/server";
import type { Beyblade, BeybladeCategory, BeybladeDeck, BeybladeSystemLine, MatchScore } from "@/lib/types/database";

// Every function below defaults to the request's own RLS-respecting
// client, but accepts this as an override — used exactly once today (the
// Judge Console's getParticipantComboSlots, app/tournaments/[slug]/judge/actions.ts),
// which legitimately needs to read a *different* profile's private
// deck/combo data and has to pass an elevated (service-role) client to do
// it, since beyblade_decks/beyblade_combos RLS only ever allows a profile
// to read its own.
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// The shape both the Blade/Ratchet/Bit pickers (ComboForm) and a combo's
// embedded parts (ComboWithParts below) share — one beyblade row, trimmed
// to what a combo card/form actually needs. `category`/`systemLine`/
// `expandBlade`/the 5 assembly ids ride along on every option (not just
// Blade ones) since every beyblade row has them regardless of category —
// ComboForm uses them to show a Custom Line Blade's own sub-assembly and
// to tell a Ratchet-Integrated part apart from a plain one.
export interface ComboPartOption {
  id: string;
  name: string;
  shortName: string;
  imageUrl: string | null;
  attack: number | null;
  defense: number | null;
  stamina: number | null;
  height: number | null;
  dash: number | null;
  burstResistance: number | null;
  category: BeybladeCategory;
  systemLine: BeybladeSystemLine;
  expandBlade: boolean;
  lockChipId: string | null;
  mainBladeId: string | null;
  overBladeId: string | null;
  metalBladeId: string | null;
  assistBladeId: string | null;
}

function toPartOption(b: Beyblade): ComboPartOption {
  return {
    id: b.id,
    name: b.name,
    shortName: b.short_name,
    imageUrl: b.image_url,
    attack: b.attack,
    defense: b.defense,
    stamina: b.stamina,
    height: b.height,
    dash: b.dash,
    burstResistance: b.burst_resistance,
    category: b.category,
    systemLine: b.system_line,
    expandBlade: b.expand_blade,
    lockChipId: b.lock_chip_id,
    mainBladeId: b.main_blade_id,
    overBladeId: b.over_blade_id,
    metalBladeId: b.metal_blade_id,
    assistBladeId: b.assist_blade_id,
  };
}

// The Blade "name" reads as two blocks — space-joined full names, then
// (for a self-assembled Blade) short codes glued together with no space —
// and the display line goes on to glue the Ratchet/Bit short codes onto
// that same short-code block too (see ComboPartsLine): e.g. a self-assembled
// "Dran"+"Brave"+"S" Blade with Ratchet "6-60" and Bit "V" reads
// "Dran Brave S6-60V"; expanded, "OB" (Over Blade) + "0-60" (Ratchet) + "B"
// (Bit) reads "...OB0-60B"; an existing catalog Blade "Shark Scale" (no
// short code of its own) + Ratchet "3-60" + Bit "L" reads
// "Shark Scale 3-60L".
export interface ComboBladeDisplay {
  nameLabel: string;
  shortLabel: string;
}

// Which specific slot a self-assembled Blade's part fills — unlike
// `bladeParts` (a flat list, order not semantically meaningful beyond
// display), this is how conflict-checking (lib/beyblades/combo-conflicts.ts)
// knows which picker category a given part belongs to, so it can offer a
// same-category replacement. Empty for an existing catalog Blade — that's
// a single indivisible piece, not a set of roles (see `blade` itself then).
export type BladePartRole = "lockChip" | "mainBlade" | "metalBlade" | "overBlade" | "assistBlade";
export type ComboBladeRoles = Partial<Record<BladePartRole, ComboPartOption>>;

export interface ComboWithParts {
  id: string;
  profileId: string;
  name: string;
  // Stats + identity (id: "" marks a self-assembled Blade — see
  // synthesizeCustomBlade) — used for math, not display; see bladeDisplay.
  blade: ComboPartOption;
  // The real catalog part(s) that make up the Blade slot, for thumbnails —
  // just the one picked Blade normally, or up to 4 (Lock Chip, Main/Metal
  // Blade, Over Blade, Assist Blade) when self-assembled.
  bladeParts: ComboPartOption[];
  bladeRoles: ComboBladeRoles;
  bladeDisplay: ComboBladeDisplay;
  // null when blade or bit is itself Ratchet-Integrated — see
  // 20250101000044_beyblade_combos_ratchet_optional.sql.
  ratchet: ComboPartOption | null;
  bit: ComboPartOption;
  createdAt: string;
  updatedAt: string;
}

// blade/bit each additionally offer their Ratchet-Integrated counterpart
// (one physical piece that already includes the ratchet layer) — ComboForm
// hides the Ratchet field and filters the other one of this pair out once
// either is picked, since a combo only ever has one ratchet layer total.
// The 5 assembly lists let a player self-assemble a Blade directly (see
// synthesizeCustomBlade below) the same way the admin catalog's Blade
// Assembly does for a 'blade' category row.
export interface ComboPickerOptions {
  blades: ComboPartOption[];
  ratchets: ComboPartOption[];
  bits: ComboPartOption[];
  lockChips: ComboPartOption[];
  mainBlades: ComboPartOption[];
  overBlades: ComboPartOption[];
  metalBlades: ComboPartOption[];
  assistBlades: ComboPartOption[];
}

export async function getComboPickerOptions(): Promise<ComboPickerOptions> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("beyblades")
    .select("*")
    .in("category", [
      "blade",
      "ratchet_integrated_blade",
      "ratchet",
      "bit",
      "ratchet_integrated_bit",
      "lock_chip",
      "main_blade",
      "over_blade",
      "metal_blade",
      "assist_blade",
    ])
    .order("name");
  const rows = (data as Beyblade[] | null) ?? [];
  const byCategory = (...categories: string[]) => rows.filter((r) => categories.includes(r.category)).map(toPartOption);

  return {
    blades: byCategory("blade", "ratchet_integrated_blade"),
    ratchets: byCategory("ratchet"),
    bits: byCategory("bit", "ratchet_integrated_bit"),
    lockChips: byCategory("lock_chip"),
    mainBlades: byCategory("main_blade"),
    overBlades: byCategory("over_blade"),
    metalBlades: byCategory("metal_blade"),
    assistBlades: byCategory("assist_blade"),
  };
}

interface ComboRow {
  id: string;
  profile_id: string;
  name: string;
  expand_blade: boolean;
  created_at: string;
  updated_at: string;
  blade: Beyblade | null;
  ratchet: Beyblade | null;
  bit: Beyblade;
  lock_chip: Beyblade | null;
  main_blade: Beyblade | null;
  over_blade: Beyblade | null;
  metal_blade: Beyblade | null;
  assist_blade: Beyblade | null;
}

// The 4 (at most) real catalog rows behind a self-assembled Blade — Over
// Blade only counts when expanded (it's swapped in for Main Blade's slot
// alongside Metal Blade then, not an addition to it). Shared by
// synthesizeCustomBlade/bladeDisplayFor/bladePartsFor below so none of them
// re-derive "which parts actually apply" on their own.
function customAssemblyParts(row: ComboRow) {
  return {
    lockChip: row.lock_chip,
    core: row.expand_blade ? row.metal_blade : row.main_blade,
    overBlade: row.expand_blade ? row.over_blade : null,
    assistBlade: row.assist_blade,
  };
}

// Builds a "virtual" ComboPartOption for a self-assembled Blade (row.blade
// is null in that case — see the XOR check constraint,
// 20250101000045_beyblade_combos_custom_assembly.sql) — sums the picked
// parts' stats for combo stat math. `id: ""` marks it as not a real
// catalog row — see comboToFormValues (ComboForm.tsx), which uses that to
// tell the two Blade modes apart. Its name/shortName aren't shown anywhere
// (see bladeDisplayFor for the actual display label) — they only need to
// be non-empty as a reasonable fallback (e.g. an alt tag).
function synthesizeCustomBlade(row: ComboRow): ComboPartOption {
  const { lockChip, core, overBlade, assistBlade } = customAssemblyParts(row);
  const label = [lockChip?.name, core?.name, overBlade?.short_name, assistBlade?.short_name].filter((s): s is string => !!s).join(" ") || "Custom Blade";

  const parts = [lockChip, core, overBlade, assistBlade];
  const sum = (pick: (b: Beyblade) => number | null) => parts.reduce((total, p) => total + (p ? (pick(p) ?? 0) : 0), 0);

  return {
    id: "",
    name: label,
    shortName: label,
    imageUrl: core?.image_url ?? lockChip?.image_url ?? null,
    attack: sum((b) => b.attack),
    defense: sum((b) => b.defense),
    stamina: sum((b) => b.stamina),
    height: sum((b) => b.height),
    dash: sum((b) => b.dash),
    burstResistance: sum((b) => b.burst_resistance),
    category: "blade",
    systemLine: "custom_line",
    expandBlade: row.expand_blade,
    lockChipId: lockChip?.id ?? null,
    mainBladeId: row.main_blade?.id ?? null,
    overBladeId: row.over_blade?.id ?? null,
    metalBladeId: row.metal_blade?.id ?? null,
    assistBladeId: assistBlade?.id ?? null,
  };
}

// See ComboBladeDisplay's own comment for the exact concatenation rule and
// worked examples.
function bladeDisplayFor(row: ComboRow): ComboBladeDisplay {
  if (row.blade) return { nameLabel: row.blade.name, shortLabel: "" };
  const { lockChip, core, overBlade, assistBlade } = customAssemblyParts(row);
  return {
    nameLabel: [lockChip?.name, core?.name].filter((s): s is string => !!s).join(" "),
    shortLabel: [overBlade?.short_name, assistBlade?.short_name].filter((s): s is string => !!s).join(""),
  };
}

// The real part(s) to show a thumbnail for — the one picked Blade, or (self-
// assembled) each of its constituent parts individually.
function bladePartsFor(row: ComboRow): ComboPartOption[] {
  if (row.blade) return [toPartOption(row.blade)];
  const { lockChip, core, overBlade, assistBlade } = customAssemblyParts(row);
  return [lockChip, core, overBlade, assistBlade].filter((b): b is Beyblade => b !== null).map(toPartOption);
}

function bladeRolesFor(row: ComboRow): ComboBladeRoles {
  if (row.blade) return {};
  const { lockChip, core, overBlade, assistBlade } = customAssemblyParts(row);
  const roles: ComboBladeRoles = {};
  if (lockChip) roles.lockChip = toPartOption(lockChip);
  if (core) {
    if (row.expand_blade) roles.metalBlade = toPartOption(core);
    else roles.mainBlade = toPartOption(core);
  }
  if (overBlade) roles.overBlade = toPartOption(overBlade);
  if (assistBlade) roles.assistBlade = toPartOption(assistBlade);
  return roles;
}

function toComboWithParts(row: ComboRow): ComboWithParts {
  return {
    id: row.id,
    profileId: row.profile_id,
    name: row.name,
    blade: row.blade ? toPartOption(row.blade) : synthesizeCustomBlade(row),
    bladeParts: bladePartsFor(row),
    bladeRoles: bladeRolesFor(row),
    bladeDisplay: bladeDisplayFor(row),
    ratchet: row.ratchet ? toPartOption(row.ratchet) : null,
    bit: toPartOption(row.bit),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const COMBO_SELECT =
  "id, profile_id, name, expand_blade, created_at, updated_at, " +
  "blade:beyblades!blade_id(*), ratchet:beyblades!ratchet_id(*), bit:beyblades!bit_id(*), " +
  "lock_chip:beyblades!lock_chip_id(*), main_blade:beyblades!main_blade_id(*), " +
  "over_blade:beyblades!over_blade_id(*), metal_blade:beyblades!metal_blade_id(*), assist_blade:beyblades!assist_blade_id(*)";

export async function listUserCombos(profileId: string): Promise<ComboWithParts[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("beyblade_combos")
    .select(COMBO_SELECT)
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  return ((data as unknown as ComboRow[] | null) ?? []).map(toComboWithParts);
}

export async function getUserCombo(id: string, profileId: string): Promise<ComboWithParts | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("beyblade_combos").select(COMBO_SELECT).eq("id", id).eq("profile_id", profileId).maybeSingle();
  return data ? toComboWithParts(data as unknown as ComboRow) : null;
}

// "Deck A", "Deck B", "Deck C", ... "Deck Z", "Deck AA", ... — same scheme
// spreadsheet columns use, so it keeps making sensible names indefinitely
// without a hardcoded list. Only matters for auto-provisioned decks; a
// rename feature (whenever one exists) would just overwrite `name` free-form.
function deckNameForIndex(index: number): string {
  let letters = "";
  let n = index;
  do {
    letters = String.fromCharCode(65 + (n % 26)) + letters;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `Deck ${letters}`;
}

// Every profile always has at least this many decks — auto-provisioned
// lazily the first time they visit Build Your Deck. v1's UI only exposes
// picking among these fixed 3, but raising this constant (or adding a
// "+ New Deck" action later, which would just insert one more the same
// way) doesn't need a schema change — `beyblade_decks` was never capped
// at one row per profile, only `is_active` is (see
// 20250101000043_beyblade_decks_one_active.sql).
const MIN_DECKS = 3;

export async function listOrCreateUserDecks(profileId: string): Promise<BeybladeDeck[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("beyblade_decks").select("*").eq("profile_id", profileId).order("created_at", { ascending: true });
  const decks = (data as BeybladeDeck[] | null) ?? [];

  const missing = MIN_DECKS - decks.length;
  if (missing <= 0) return decks;

  const toInsert = Array.from({ length: missing }, (_, i) => ({
    profile_id: profileId,
    name: deckNameForIndex(decks.length + i),
    // The very first deck a profile ever gets is active by default;
    // topping up an existing profile to MIN_DECKS never touches is_active
    // (they already have one active among their existing decks).
    is_active: decks.length === 0 && i === 0,
  }));
  const { data: created, error } = await supabase.from("beyblade_decks").insert(toInsert).select("*");
  // A schema/RLS problem shouldn't crash the page — just show fewer decks
  // than MIN_DECKS rather than erroring out.
  if (error || !created) return decks;
  return [...decks, ...(created as BeybladeDeck[])];
}

export async function getUserDeck(id: string, profileId: string): Promise<BeybladeDeck | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("beyblade_decks").select("*").eq("id", id).eq("profile_id", profileId).maybeSingle();
  return (data as BeybladeDeck | null) ?? null;
}

// Read-only counterpart to listOrCreateUserDecks — never auto-provisions.
// Used when the *caller* isn't the profile in question (the Judge
// Console looking up a linked participant's deck), where silently
// creating decks in someone else's account as a side effect of someone
// else's action would be wrong; a profile that's never visited Build
// Your Deck just has no active deck to find yet.
export async function getActiveDeckReadOnly(profileId: string, client?: SupabaseServerClient): Promise<BeybladeDeck | null> {
  const supabase = client ?? (await createClient());
  const { data } = await supabase.from("beyblade_decks").select("*").eq("profile_id", profileId).eq("is_active", true).maybeSingle();
  return (data as BeybladeDeck | null) ?? null;
}

// Resolves a deck's 3 slot columns into full combo data, in slot order —
// `null` for an empty or deleted-out-from-under-it slot.
export async function getDeckCombos(deck: BeybladeDeck, profileId: string, client?: SupabaseServerClient): Promise<(ComboWithParts | null)[]> {
  const ids = [deck.combo_1_id, deck.combo_2_id, deck.combo_3_id];
  const uniqueIds = [...new Set(ids.filter((id): id is string => id !== null))];
  if (uniqueIds.length === 0) return [null, null, null];

  const supabase = client ?? (await createClient());
  const { data } = await supabase.from("beyblade_combos").select(COMBO_SELECT).in("id", uniqueIds).eq("profile_id", profileId);
  const byId = new Map(((data as unknown as ComboRow[] | null) ?? []).map((r) => [r.id, toComboWithParts(r)]));
  return ids.map((id) => (id ? (byId.get(id) ?? null) : null));
}

export interface ComboMatchStats {
  wins: number;
  losses: number;
  draws: number;
  matches: number;
  winRate: number;
}

export const EMPTY_COMBO_MATCH_STATS: ComboMatchStats = { wins: 0, losses: 0, draws: 0, matches: 0, winRate: 0 };

// Real per-combo W-L record, built from `matches.score.battles` — each
// battle's `participantACombo`/`participantBCombo` is the combo id/name
// snapshotted at judge-scoring time (see JudgeConsole's incrementFinish),
// so this reads actual match history rather than live deck state: a combo
// renamed or removed from a deck since doesn't change what it already won
// or lost. Keyed by combo id; a combo with no recorded battles simply has
// no entry (callers should fall back to EMPTY_COMBO_MATCH_STATS).
//
// "Matches" here means battles (one entry in `score.battles`), not whole
// tournament matches — a single match can use more than one combo if the
// player rearranged their deck partway through, so per-combo win/loss is
// naturally counted per battle, not per match.
//
// `matches`/`participant_links` are both publicly readable (see
// 20250101000006_functions_and_rls.sql / 20250101000036_participant_links.sql),
// so this only ever needs the caller's own RLS-respecting client.
export async function getComboMatchStatsForProfile(profileId: string, client?: SupabaseServerClient): Promise<Map<string, ComboMatchStats>> {
  const supabase = client ?? (await createClient());

  const { data: linkRows } = await supabase.from("participant_links").select("participant_id").eq("profile_id", profileId).eq("status", "approved");
  const participantIds = [...new Set((linkRows ?? []).map((r) => r.participant_id as string))];
  if (participantIds.length === 0) return new Map();

  const orFilter = ["participant_a_id", "participant_b_id"].map((col) => `${col}.in.(${participantIds.join(",")})`).join(",");
  const { data: matchRows } = await supabase
    .from("matches")
    .select("participant_a_id, participant_b_id, score")
    .eq("status", "completed")
    .or(orFilter);

  const tally = new Map<string, { name: string; wins: number; losses: number }>();
  const bump = (comboId: string, comboName: string, won: boolean) => {
    const entry = tally.get(comboId) ?? { name: comboName, wins: 0, losses: 0 };
    if (won) entry.wins += 1;
    else entry.losses += 1;
    tally.set(comboId, entry);
  };

  for (const row of (matchRows ?? []) as { participant_a_id: string | null; participant_b_id: string | null; score: MatchScore | null }[]) {
    const battles = row.score?.battles ?? [];
    const isA = row.participant_a_id !== null && participantIds.includes(row.participant_a_id);
    const isB = row.participant_b_id !== null && participantIds.includes(row.participant_b_id);
    if (!isA && !isB) continue;
    for (const battle of battles) {
      if (isA && battle.participantACombo) bump(battle.participantACombo.id, battle.participantACombo.name, battle.winnerId === row.participant_a_id);
      if (isB && battle.participantBCombo) bump(battle.participantBCombo.id, battle.participantBCombo.name, battle.winnerId === row.participant_b_id);
    }
  }

  const stats = new Map<string, ComboMatchStats>();
  for (const [comboId, { wins, losses }] of tally) {
    const matches = wins + losses;
    stats.set(comboId, { wins, losses, draws: 0, matches, winRate: matches > 0 ? Math.round((wins / matches) * 100) : 0 });
  }
  return stats;
}
