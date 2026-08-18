// Combo stats are just the three parts' stats summed — there's no separate
// "combo" stat anywhere in the catalog. Used both by the combo form's
// (view-only) range bars and the combo list's atk/def/sta/height/dash/burst
// res row.
export interface ComboPartStats {
  attack: number | null;
  defense: number | null;
  stamina: number | null;
  height: number | null;
  dash: number | null;
  burstResistance: number | null;
}

export interface ComboStats {
  attack: number;
  defense: number;
  stamina: number;
  height: number;
  dash: number;
  burstResistance: number;
}

export function computeComboStats(parts: (ComboPartStats | null)[]): ComboStats {
  const totals: ComboStats = { attack: 0, defense: 0, stamina: 0, height: 0, dash: 0, burstResistance: 0 };
  for (const part of parts) {
    if (!part) continue;
    totals.attack += part.attack ?? 0;
    totals.defense += part.defense ?? 0;
    totals.stamina += part.stamina ?? 0;
    totals.height += part.height ?? 0;
    totals.dash += part.dash ?? 0;
    totals.burstResistance += part.burstResistance ?? 0;
  }
  return totals;
}

// Caps for the view-only range bars — a combo sums 3 parts, and catalog
// values run noticeably higher for atk/def/sta than for height/dash/burst
// res (which are usually driven by just one or two of the three parts).
// These are generous approximations for a decorative bar, not a game rule.
export const COMBO_STAT_CAPS: Record<keyof ComboStats, number> = {
  attack: 200,
  defense: 200,
  stamina: 200,
  height: 250,
  dash: 250,
  burstResistance: 100,
};

export function comboStatPercent(stat: keyof ComboStats, value: number): number {
  return Math.max(0, Math.min(100, Math.round((value / COMBO_STAT_CAPS[stat]) * 100)));
}
