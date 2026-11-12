import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ComboForm } from "@/components/dashboard/beyblade/ComboForm";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { getComboPickerOptions, getUserCombo } from "@/app/account/beyblade/data";
import { PageHeader } from "@/components/dashboard/erp";

export const metadata: Metadata = { title: "Edit Beyblade Combo", robots: { index: false, follow: false } };

export default async function EditComboPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectTo=/account/beyblade/combos/${id}`);

  const [combo, pickerOptions] = await Promise.all([getUserCombo(id, user.id), getComboPickerOptions()]);
  if (!combo) notFound();

  return (
    <div>
      <PageHeader
        eyebrow="Beyblade Dashboard"
        title={<>Edit {combo.name}</>}
      />
      <div className="mt-5 max-w-2xl">
        <ComboForm combo={combo} pickerOptions={pickerOptions} />
      </div>
    </div>
  );
}
