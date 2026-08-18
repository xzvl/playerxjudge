import { createClient } from "@/lib/supabase/server";
import type { Beyblade } from "@/lib/types/database";

export async function listBeyblades(): Promise<Beyblade[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("beyblades").select("*").order("created_at", { ascending: false });
  return (data as Beyblade[] | null) ?? [];
}

export async function getBeyblade(id: string): Promise<Beyblade | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("beyblades").select("*").eq("id", id).maybeSingle();
  return (data as Beyblade | null) ?? null;
}

// imageUrl (for the picker's dropdown/selection preview) and the 6 stat
// fields (for auto-computing a Custom Line "Blade"'s stats from its
// assembly — see BeybladeForm's assemblyStats) ride along with every
// option now, not just id/name.
export interface BeybladePickerOption {
  id: string;
  name: string;
  imageUrl: string | null;
  attack: number | null;
  defense: number | null;
  stamina: number | null;
  height: number | null;
  dash: number | null;
  burstResistance: number | null;
}

export interface BeybladePickerOptions {
  lockChips: BeybladePickerOption[];
  mainBlades: BeybladePickerOption[];
  overBlades: BeybladePickerOption[];
  metalBlades: BeybladePickerOption[];
  assistBlades: BeybladePickerOption[];
}

// Options for the Blade-assembly pickers (Lock Chip/Main Blade/Over Blade/
// Metal Blade/Assist Blade) — every beyblade in each of those five
// component categories. `excludeId` drops the row being edited so it
// can't reference itself.
export async function getBeybladePickerOptions(excludeId?: string): Promise<BeybladePickerOptions> {
  const supabase = await createClient();
  let query = supabase
    .from("beyblades")
    .select("*")
    .in("category", ["lock_chip", "main_blade", "over_blade", "metal_blade", "assist_blade"])
    .order("name");
  if (excludeId) query = query.neq("id", excludeId);

  const { data } = await query;
  const rows = (data as Beyblade[] | null) ?? [];
  const toOption = (r: Beyblade): BeybladePickerOption => ({
    id: r.id,
    name: r.name,
    imageUrl: r.image_url,
    attack: r.attack,
    defense: r.defense,
    stamina: r.stamina,
    height: r.height,
    dash: r.dash,
    burstResistance: r.burst_resistance,
  });
  const byCategory = (category: string) => rows.filter((r) => r.category === category).map(toOption);

  return {
    lockChips: byCategory("lock_chip"),
    mainBlades: byCategory("main_blade"),
    overBlades: byCategory("over_blade"),
    metalBlades: byCategory("metal_blade"),
    assistBlades: byCategory("assist_blade"),
  };
}
