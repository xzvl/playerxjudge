import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ComboForm } from "@/components/dashboard/beyblade/ComboForm";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { getComboPickerOptions, getUserCombo } from "@/app/account/beyblade/data";

export const metadata: Metadata = { title: "Edit Beyblade Combo", robots: { index: false, follow: false } };

export default async function EditComboPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectTo=/account/beyblade/combos/${id}`);

  const [combo, pickerOptions] = await Promise.all([getUserCombo(id, user.id), getComboPickerOptions()]);
  if (!combo) notFound();

  return (
    <div>
      <p className="label-mono text-primary">Beyblade Dashboard</p>
      <h1 className="heading mt-2 text-3xl">Edit {combo.name}</h1>
      <div className="mt-8 max-w-2xl">
        <ComboForm combo={combo} pickerOptions={pickerOptions} />
      </div>
    </div>
  );
}
