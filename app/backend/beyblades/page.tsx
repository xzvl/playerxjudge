import type { Metadata } from "next";

import { BeybladesPanel, type BeybladeItem } from "@/components/backend/BeybladesPanel";
import { listBeyblades } from "@/app/backend/beyblades/data";

export const metadata: Metadata = { title: "Beyblades", robots: { index: false, follow: false } };

export default async function BackendBeybladesPage() {
  const beyblades = await listBeyblades();

  const items: BeybladeItem[] = beyblades.map((b) => ({
    id: b.id,
    code: b.code,
    name: b.name,
    shortName: b.short_name,
    type: b.type,
    systemLine: b.system_line,
    category: b.category,
    spinDirection: b.spin_direction,
    attack: b.attack,
    defense: b.defense,
    stamina: b.stamina,
    height: b.height,
    dash: b.dash,
    burstResistance: b.burst_resistance,
    description: b.description,
    series: b.series,
    imageUrl: b.image_url,
  }));

  return (
    <div>
      <p className="label-mono text-primary">Backend</p>
      <h1 className="heading mt-2 text-3xl">Beyblades</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">The full parts catalog — blades, ratchets, bits, and every Custom Line component.</p>
      <div className="mt-8">
        <BeybladesPanel beyblades={items} />
      </div>
    </div>
  );
}
