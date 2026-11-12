import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BeybladeForm } from "@/components/backend/BeybladeForm";
import { getBeyblade, getBeybladePickerOptions } from "@/app/backend/beyblades/data";
import { PageHeader } from "@/components/dashboard/erp";

export const metadata: Metadata = { title: "Edit Beyblade", robots: { index: false, follow: false } };

export default async function EditBeybladePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [beyblade, pickerOptions] = await Promise.all([getBeyblade(id), getBeybladePickerOptions(id)]);
  if (!beyblade) notFound();

  return (
    <div>
      <PageHeader
        eyebrow="Backend"
        title={<>{beyblade.name}</>}
        description={<>Editing this beyblade&apos;s catalog entry.</>}
      />
      <div className="mt-5 max-w-2xl">
        <BeybladeForm beyblade={beyblade} pickerOptions={pickerOptions} />
      </div>
    </div>
  );
}
