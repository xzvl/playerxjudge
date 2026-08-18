"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { comboStatPercent, type ComboStats } from "@/lib/beyblades/combo-stats";
import type { ComboBladeDisplay, ComboPartOption, ComboWithParts } from "@/app/account/beyblade/data";

// Small building blocks shared by every combo card across the Beyblade
// Dashboard (Overview's Most Used/Best Combo, Build Your Deck's slots, the
// Beyblade Combo list) — kept together since none of them is more than a
// few lines and they're always used side by side.

// Named presets, not a strict small<medium<large scale — "lg" (h-14) sits
// between "sm" (h-12) and "md" (h-16) in practice, used to give the Blade
// stack its own size independent of Ratchet/Bit (see ComboThumbnails'
// bladeSize).
const THUMBNAIL_DIMENSIONS = { sm: "h-12 w-12", md: "h-16 w-16", lg: "h-14 w-14" } as const;
type ThumbnailSize = keyof typeof THUMBNAIL_DIMENSIONS;

// A single part's square image (or a "—" placeholder when it has none) —
// the shared unit ComboThumbnails lines up three of, and also used on its
// own for the combo form's per-field selection preview (with fit="contain",
// which pads the image against a white backing rather than cropping it —
// see ComboForm, where these are the actual part photo, not a cropped
// decorative thumbnail).
export function PartThumbnail({
  part,
  size = "md",
  fit = "cover",
  className,
}: {
  part: ComboPartOption;
  size?: ThumbnailSize;
  fit?: "cover" | "contain";
  className?: string;
}) {
  return (
    <div
      title={part.shortName}
      className={cn(
        THUMBNAIL_DIMENSIONS[size],
        "flex shrink-0 items-center justify-center overflow-hidden border border-outline-variant/25",
        fit === "contain" ? "bg-white p-[1px]" : "bg-surface-container-low",
        className
      )}
    >
      {part.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={part.imageUrl} alt={part.shortName} className={cn("h-full w-full", fit === "contain" ? "object-contain" : "object-cover")} />
      ) : (
        <span className="text-[9px] text-on-surface/30">—</span>
      )}
    </div>
  );
}

// Stacking order for the overlap below — fixed per role rather than
// display/array position, so e.g. Lock Chip always sits in front
// regardless of whether the combo used Main Blade or Metal Blade next to
// it. Not in this map (a single existing catalog Blade, "blade"/
// "ratchet_integrated_blade") never overlaps another image, so it doesn't
// need one.
const BLADE_PART_Z_INDEX: Partial<Record<ComboPartOption["category"], number>> = {
  lock_chip: 5,
  main_blade: 4,
  metal_blade: 3,
  over_blade: 2,
  assist_blade: 1,
};

// The Blade slot's own images (Lock Chip, Main/Metal Blade, Over Blade,
// Assist Blade — or just the one picked catalog Blade) render as a single
// overlapping stack in one container: no per-image border/background, no
// gap, each one laid -2rem over the previous. Deliberately distinct from
// PartThumbnail's individually framed treatment, which Ratchet/Bit still
// use in ComboThumbnails below.
function BladeAssemblyThumbnails({ parts, size, fit }: { parts: ComboPartOption[]; size: ThumbnailSize; fit: "cover" | "contain" }) {
  return (
    <div className="flex items-center justify-center overflow-hidden border border-outline-variant/25 bg-white p-[1px]">
      {parts
        .filter((part): part is ComboPartOption & { imageUrl: string } => !!part.imageUrl)
        .map((part, i) => (
          <div
            key={i}
            title={part.shortName}
            className={cn(THUMBNAIL_DIMENSIONS[size], "shrink-0 overflow-hidden", i > 0 && "-ml-8")}
            style={{ zIndex: BLADE_PART_Z_INDEX[part.category] ?? i }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={part.imageUrl} alt={part.shortName} className={cn("h-full w-full", fit === "contain" ? "object-contain" : "object-cover")} />
          </div>
        ))}
    </div>
  );
}

// bladeParts is the real catalog part(s) behind the Blade slot — one for
// an existing pick, or (self-assembled) each of Lock Chip/Main or Metal
// Blade/Over Blade/Assist Blade individually (see ComboWithParts,
// app/account/beyblade/data.ts) — see BladeAssemblyThumbnails above for
// how those render. ratchet is null when blade or bit is itself
// Ratchet-Integrated — that piece already supplies the ratchet layer, so
// there's nothing separate to show a thumbnail for.
export function ComboThumbnails({
  bladeParts,
  ratchet,
  bit,
  size = "md",
  bladeSize,
  fit = "cover",
}: {
  bladeParts: ComboPartOption[];
  ratchet: ComboPartOption | null;
  bit: ComboPartOption;
  size?: ThumbnailSize;
  // Defaults to `size` — set this to size the Blade stack independently of
  // Ratchet/Bit (see /tournaments/[slug]/player's CurrentDeckSection).
  bladeSize?: ThumbnailSize;
  fit?: "cover" | "contain";
}) {
  const rest = [ratchet, bit].filter((p): p is ComboPartOption => p !== null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {bladeParts.length > 0 ? <BladeAssemblyThumbnails parts={bladeParts} size={bladeSize ?? size} fit={fit} /> : null}
      {rest.map((part, i) => (
        <PartThumbnail key={i} part={part} size={size} fit={fit} />
      ))}
    </div>
  );
}

// See ComboBladeDisplay's own comment (app/account/beyblade/data.ts) for
// the exact concatenation rule and worked examples.
export function ComboPartsLine({ bladeDisplay, ratchet, bit }: { bladeDisplay: ComboBladeDisplay; ratchet: ComboPartOption | null; bit: ComboPartOption }) {
  const shortBlock = [bladeDisplay.shortLabel, ratchet?.shortName, bit.shortName].filter((s): s is string => !!s).join("");
  const line = [bladeDisplay.nameLabel, shortBlock].filter(Boolean).join(" ");
  return <p className="truncate text-sm text-on-surface/50">{line}</p>;
}

export function StatChip({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="font-mono text-sm font-bold text-on-surface">{value}</p>
      <p className="label-mono mt-0.5 text-[9px] text-on-surface/40">{label}</p>
    </div>
  );
}

// Fallback for a combo with no entry in getComboMatchStatsForProfile's map
// (app/account/beyblade/data.ts) — i.e. one with no recorded battles yet.
// Defined here rather than imported as a value from data.ts: this file is
// "use client", and data.ts pulls in next/headers (via lib/supabase/server)
// through getCurrentUser/createClient, so importing anything but its
// *types* here would drag that server-only code into the client bundle.
export const EMPTY_COMBO_MATCH_STATS = { wins: 0, losses: 0, draws: 0, matches: 0, winRate: 0 };

// W-L-T / Win Rate / Matches — the match-usage stat row every combo card
// shows. Backed by real data (see getComboMatchStatsForProfile) — zero for
// a combo that's never actually been used in a judge-scored battle yet,
// which is expected, not a bug, so this always renders rather than hiding
// behind a "no data yet".
export function ComboMatchStats({ wins, losses, draws, matches, winRate }: { wins: number; losses: number; draws: number; matches: number; winRate: number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <StatChip value={`${wins}-${losses}-${draws}`} label="W-L-T" />
      <div className="h-8 w-px bg-outline-variant/25" />
      <StatChip value={`${winRate}%`} label="Win Rate" />
      <div className="h-8 w-px bg-outline-variant/25" />
      <StatChip value={String(matches)} label="Matches" />
    </div>
  );
}

// View-only, animated on mount — never reflects an editable value (see
// ComboStatBars below, which visualizes the sum of the 3 chosen parts'
// stats and is the only thing that ever sets `percent`).
export function StatRangeBar({ percent }: { percent: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setWidth(percent));
    return () => cancelAnimationFrame(frame);
  }, [percent]);

  return (
    <div className="h-2 w-full bg-surface-container-high">
      <div className="h-2 bg-primary transition-all duration-700 ease-out" style={{ width: `${width}%` }} />
    </div>
  );
}

// [label, ComboStats key] — atk/def/sta, then height/dash/burst res, as two
// rows of 3.
const PRIMARY_STAT_FIELDS = [
  ["Atk", "attack"],
  ["Def", "defense"],
  ["Sta", "stamina"],
] as const;

const SECONDARY_STAT_FIELDS = [
  ["Height", "height"],
  ["Dash", "dash"],
  ["Burst Res", "burstResistance"],
] as const;

function StatBar({ label, statKey, stats }: { label: string; statKey: keyof ComboStats; stats: ComboStats }) {
  const value = stats[statKey];
  return (
    <div>
      <p className="mb-1.5 flex items-center justify-between text-xs text-on-surface/60">
        <span>{label}</span>
        <span className="font-mono font-bold text-on-surface">{value}</span>
      </p>
      <StatRangeBar percent={comboStatPercent(statKey, value)} />
    </div>
  );
}

// The combo stats layout shared by the combo form (live, as parts are
// picked) and the Beyblade Combo list (the saved combo's final stats) —
// two rows of 3 view-only range bars, atk/def/sta then height/dash/burst
// res.
export function ComboStatBars({ stats }: { stats: ComboStats }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {PRIMARY_STAT_FIELDS.map(([label, key]) => (
          <StatBar key={key} label={label} statKey={key} stats={stats} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {SECONDARY_STAT_FIELDS.map(([label, key]) => (
          <StatBar key={key} label={label} statKey={key} stats={stats} />
        ))}
      </div>
    </div>
  );
}

// One deck slot — a saved combo (with Change/Clear actions) or, empty, a
// dashed "Assign Combo" prompt. Used both by DeckSlots (a single deck's 3
// slots, on /account/beyblade/deck/[id]) and DeckRows (every deck's slots
// at once, on the main Build Your Deck page).
export function DeckSlotCard({
  combo,
  stats,
  pending,
  onChange,
  onClear,
}: {
  combo: ComboWithParts | null;
  // Real per-combo W-L record (see getComboMatchStatsForProfile) — always
  // EMPTY_COMBO_MATCH_STATS for a combo with no recorded battles yet.
  stats: { wins: number; losses: number; draws: number; matches: number; winRate: number };
  pending: boolean;
  onChange: () => void;
  onClear: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        {combo ? (
          <>
            <ComboThumbnails bladeParts={combo.bladeParts} ratchet={combo.ratchet} bit={combo.bit} fit="contain" />
            <p className="mt-3 heading truncate text-on-surface">{combo.name}</p>
            <ComboPartsLine bladeDisplay={combo.bladeDisplay} ratchet={combo.ratchet} bit={combo.bit} />
            <div className="my-4 border-t border-outline-variant/20" />
            <ComboMatchStats {...stats} />
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" tooltip="Assign a different combo to this slot" disabled={pending} onClick={onChange}>
                Change
              </Button>
              <Button variant="outline" size="icon" tooltip="Clear this slot" aria-label="Clear this slot" disabled={pending} onClick={onClear}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={onChange}
            className="flex h-full min-h-48 w-full flex-col items-center justify-center gap-2 border border-dashed border-outline-variant/40 text-on-surface/40 transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-50"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            <span className="label-mono text-[10px]">Assign Combo</span>
          </button>
        )}
      </CardContent>
    </Card>
  );
}

