import { Badge } from "@/components/ui/badge";
import { BEYBLADE_TYPE_LABELS } from "@/lib/validations/beyblade";
import type { BeybladeType } from "@/lib/types/database";

const TYPE_VARIANT: Record<BeybladeType, "destructive" | "secondary" | "outline" | "default"> = {
  attack: "destructive",
  defense: "secondary",
  stamina: "outline",
  balance: "default",
};

export function BeybladeTypeBadge({ type }: { type: BeybladeType }) {
  return <Badge variant={TYPE_VARIANT[type]}>{BEYBLADE_TYPE_LABELS[type]}</Badge>;
}
