import type { Metadata } from "next";

import { BeybladeForm } from "@/components/backend/BeybladeForm";
import { getBeybladePickerOptions } from "@/app/backend/beyblades/data";

export const metadata: Metadata = { title: "Add Beyblade", robots: { index: false, follow: false } };

export default async function NewBeybladePage() {
  const pickerOptions = await getBeybladePickerOptions();

  return (
    <div>
      <p className="label-mono text-primary">Backend</p>
      <h1 className="heading mt-2 text-3xl">Add Beyblade</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Add a new piece to the catalog.</p>
      <div className="mt-8 max-w-2xl">
        <BeybladeForm pickerOptions={pickerOptions} />
      </div>
    </div>
  );
}
