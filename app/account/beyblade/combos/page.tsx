import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CombosPanel } from "@/components/dashboard/beyblade/CombosPanel";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { listUserCombos } from "@/app/account/beyblade/data";

export const metadata: Metadata = { title: "Beyblade Combo", robots: { index: false, follow: false } };

export default async function BeybladeCombosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/beyblade/combos");

  const combos = await listUserCombos(user.id);

  return (
    <div>
      <p className="label-mono text-primary">Beyblade Dashboard</p>
      <h1 className="heading mt-2 text-3xl">Beyblade Combo</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Every Blade + Ratchet + Bit loadout you&apos;ve saved.</p>
      <div className="mt-8">
        <CombosPanel combos={combos} />
      </div>
    </div>
  );
}
