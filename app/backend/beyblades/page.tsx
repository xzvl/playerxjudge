import type { Metadata } from "next";
import { Disc3, Layers } from "lucide-react";

import { BeybladesPanel, type BeybladeItem } from "@/components/backend/BeybladesPanel";
import { countBeybladeVariations, listBeyblades } from "@/app/backend/beyblades/data";
import { KpiCard, PageHeader, Panel } from "@/components/dashboard/erp";
import { BarList } from "@/components/dashboard/charts";

export const metadata: Metadata = { title: "Beyblades", robots: { index: false, follow: false } };

export default async function BackendBeybladesPage() {
  const [beyblades, variationCounts] = await Promise.all([listBeyblades(), countBeybladeVariations()]);

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
    variationCount: variationCounts.get(b.id) ?? 0,
  }));

  const humanize = (v: string) => v.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  const categoryCounts = new Map<string, number>();
  for (const b of items) {
    const key = b.category ?? "uncategorized";
    categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + 1);
  }
  const byCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]).map(([category, value]) => ({ label: humanize(category), value }));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Backend"
        title="Beyblades"
        description="The full parts catalog — blades, ratchets, bits, and every Custom Line component."
      />
      <div className="grid gap-3 lg:grid-cols-3">
        <KpiCard label="Catalog parts" value={items.length.toLocaleString()} icon={Disc3} emphasis hint={`${categoryCounts.size} categories`} />
        <Panel title="Parts by category" icon={Layers} className="lg:col-span-2">
          <BarList items={byCategory} emptyLabel="No parts yet." />
        </Panel>
      </div>
      <div>
        <BeybladesPanel beyblades={items} />
      </div>
    </div>
  );
}
