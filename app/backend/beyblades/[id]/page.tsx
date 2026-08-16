import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BeybladeForm } from "@/components/backend/BeybladeForm";
import { getBeyblade, getBeybladePickerOptions } from "@/app/backend/beyblades/data";

export const metadata: Metadata = { title: "Edit Beyblade", robots: { index: false, follow: false } };

export default async function EditBeybladePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [beyblade, pickerOptions] = await Promise.all([getBeyblade(id), getBeybladePickerOptions(id)]);
  if (!beyblade) notFound();

  return (
    <div>
      <p className="label-mono text-primary">Backend</p>
      <h1 className="heading mt-2 text-3xl">{beyblade.name}</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Editing this beyblade&apos;s catalog entry.</p>
      <div className="mt-8 max-w-2xl">
        <BeybladeForm beyblade={beyblade} pickerOptions={pickerOptions} />
      </div>
    </div>
  );
}
