import { Badge } from "@/components/ui/badge";
import { BEYBLADE_TYPE_LABELS } from "@/lib/validations/beyblade";
import type { BeybladeType } from "@/lib/types/database";

const TYPE_VARIANT: Record<BeybladeType, "destructive" | "secondary" | "outline" | "default"> = {
  attack: "destructive",
  defense: "secondary",
  stamina: "outline",
  balance: "default",
};

// null for parts that don't have a type of their own — Lock Chips,
// Ratchets, and the other individual Custom Line components (only a whole
// assembled "blade" does) — see lib/types/database.ts's Beyblade.type.
export function BeybladeTypeBadge({ type }: { type: BeybladeType | null }) {
  if (!type) return <Badge variant="outline">—</Badge>;
  return <Badge variant={TYPE_VARIANT[type]}>{BEYBLADE_TYPE_LABELS[type]}</Badge>;
}

// Selection preview for the Blade Assembly pickers (BeybladeForm) — 44px
// so it lines up with the Combobox trigger's own height, padded against a
// white backing rather than cropped (this is the actual part photo, not a
// decorative thumbnail).
export function BeybladePartThumbnail({ name, imageUrl }: { name: string; imageUrl: string | null }) {
  return (
    <div title={name} className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden border border-outline-variant/25 bg-white p-[1px]">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={name} className="h-full w-full object-contain" />
      ) : (
        <span className="text-[9px] text-on-surface/30">—</span>
      )}
    </div>
  );
}
