import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ComboForm } from "@/components/dashboard/beyblade/ComboForm";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { getComboPickerOptions } from "@/app/account/beyblade/data";
import { PageHeader } from "@/components/dashboard/erp";

export const metadata: Metadata = { title: "Add Beyblade Combo", robots: { index: false, follow: false } };

export default async function NewComboPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/beyblade/combos/new");

  const pickerOptions = await getComboPickerOptions();

  return (
    <div>
      <PageHeader
        eyebrow="Beyblade Dashboard"
        title="Add Beyblade Combo"
        description="Pick a Blade, Ratchet, and Bit to save as a new loadout."
      />
      <div className="mt-5 max-w-2xl">
        <ComboForm pickerOptions={pickerOptions} />
      </div>
    </div>
  );
}
