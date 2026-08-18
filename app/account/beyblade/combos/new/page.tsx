import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ComboForm } from "@/components/dashboard/beyblade/ComboForm";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { getComboPickerOptions } from "@/app/account/beyblade/data";

export const metadata: Metadata = { title: "Add Beyblade Combo", robots: { index: false, follow: false } };

export default async function NewComboPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/beyblade/combos/new");

  const pickerOptions = await getComboPickerOptions();

  return (
    <div>
      <p className="label-mono text-primary">Beyblade Dashboard</p>
      <h1 className="heading mt-2 text-3xl">Add Beyblade Combo</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Pick a Blade, Ratchet, and Bit to save as a new loadout.</p>
      <div className="mt-8 max-w-2xl">
        <ComboForm pickerOptions={pickerOptions} />
      </div>
    </div>
  );
}
