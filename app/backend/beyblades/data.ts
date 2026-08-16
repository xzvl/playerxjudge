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

export interface BeybladePickerOption {
  id: string;
  name: string;
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
    .select("id, name, category")
    .in("category", ["lock_chip", "main_blade", "over_blade", "metal_blade", "assist_blade"])
    .order("name");
  if (excludeId) query = query.neq("id", excludeId);

  const { data } = await query;
  const rows = (data as { id: string; name: string; category: string }[] | null) ?? [];
  const byCategory = (category: string) => rows.filter((r) => r.category === category).map((r) => ({ id: r.id, name: r.name }));

  return {
    lockChips: byCategory("lock_chip"),
    mainBlades: byCategory("main_blade"),
    overBlades: byCategory("over_blade"),
    metalBlades: byCategory("metal_blade"),
    assistBlades: byCategory("assist_blade"),
  };
}
