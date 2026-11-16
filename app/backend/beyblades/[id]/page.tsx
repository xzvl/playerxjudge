import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BeybladeForm } from "@/components/backend/BeybladeForm";
import { BeybladeVariationsPanel } from "@/components/backend/BeybladeVariationsPanel";
import { getBeyblade, getBeybladePickerOptions, listBeybladeVariations } from "@/app/backend/beyblades/data";
import { PageHeader } from "@/components/dashboard/erp";

export const metadata: Metadata = { title: "Edit Beyblade", robots: { index: false, follow: false } };

export default async function EditBeybladePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [beyblade, pickerOptions, variations] = await Promise.all([
    getBeyblade(id),
    getBeybladePickerOptions(id),
    listBeybladeVariations(id),
  ]);
  if (!beyblade) notFound();

  return (
    <div>
      <PageHeader
        eyebrow="Backend"
        title={<>{beyblade.name}</>}
        description={<>Editing this beyblade&apos;s catalog entry.</>}
      />
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,42rem)_minmax(0,1fr)] xl:items-start">
        <BeybladeForm beyblade={beyblade} pickerOptions={pickerOptions} />
        <div className="xl:sticky xl:top-16">
          <BeybladeVariationsPanel beybladeId={beyblade.id} initialVariations={variations} />
        </div>
      </div>
    </div>
  );
}
