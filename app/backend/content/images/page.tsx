import type { Metadata } from "next";

import { ImageOptimizationPanel } from "@/components/backend/content/ImageOptimizationPanel";
import { listStoredImages, type StoredImage } from "@/lib/images/optimize";

export const metadata: Metadata = { title: "Content: Images", robots: { index: false, follow: false } };
// Walking every bucket can take a while on a large site.
export const maxDuration = 60;

export default async function BackendContentImagesPage() {
  let images: StoredImage[] = [];
  let error: string | null = null;
  try {
    images = await listStoredImages();
  } catch (err) {
    error = err instanceof Error ? err.message : "Couldn't list stored images.";
  }

  return <ImageOptimizationPanel initialImages={images} loadError={error} />;
}
