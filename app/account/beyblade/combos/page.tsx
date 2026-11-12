import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CombosPanel } from "@/components/dashboard/beyblade/CombosPanel";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { listUserCombos } from "@/app/account/beyblade/data";
import { PageHeader } from "@/components/dashboard/erp";

export const metadata: Metadata = { title: "Beyblade Combo", robots: { index: false, follow: false } };

export default async function BeybladeCombosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/beyblade/combos");

  const combos = await listUserCombos(user.id);

  return (
    <div>
      <PageHeader
        eyebrow="Beyblade Dashboard"
        title="Beyblade Combo"
        description={<>Every Blade + Ratchet + Bit loadout you&apos;ve saved.</>}
      />
      <div className="mt-5">
        <CombosPanel combos={combos} />
      </div>
    </div>
  );
}
