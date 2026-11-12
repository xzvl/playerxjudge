import type { Metadata } from "next";

import { BeybladeForm } from "@/components/backend/BeybladeForm";
import { getBeybladePickerOptions } from "@/app/backend/beyblades/data";
import { PageHeader } from "@/components/dashboard/erp";

export const metadata: Metadata = { title: "Add Beyblade", robots: { index: false, follow: false } };

export default async function NewBeybladePage() {
  const pickerOptions = await getBeybladePickerOptions();

  return (
    <div>
      <PageHeader
        eyebrow="Backend"
        title="Add Beyblade"
        description="Add a new piece to the catalog."
      />
      <div className="mt-5 max-w-2xl">
        <BeybladeForm pickerOptions={pickerOptions} />
      </div>
    </div>
  );
}
