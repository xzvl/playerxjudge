"use server";

import { revalidateTag } from "next/cache";

import { isCurrentUserStaff } from "@/lib/supabase/get-user";
import { OPTIMIZABLE_BUCKETS, optimizeStoredImage, type OptimizableBucket } from "@/lib/images/optimize";
import { SITE_CONTENT_CACHE_TAG } from "@/lib/site-content/queries";
import { SPONSORS_CACHE_TAG } from "@/lib/sponsors/queries";

export interface OptimizeImageState {
  status: "success" | "error";
  message?: string;
  // Path of the WebP original (differs from the input when it was converted).
  path?: string;
  converted?: boolean;
}

// One image per call, so the page can show progress and no single request
// runs long. Uses the service role (it writes into every bucket), so the
// staff check here is the gate.
export async function optimizeImage(bucket: string, path: string): Promise<OptimizeImageState> {
  if (!(await isCurrentUserStaff())) return { status: "error", message: "Only staff can optimize images." };
  if (!OPTIMIZABLE_BUCKETS.includes(bucket as OptimizableBucket)) return { status: "error", message: "Unknown bucket." };

  try {
    const result = await optimizeStoredImage(bucket as OptimizableBucket, path);
    if (result.converted) {
      // Converted originals re-point stored URLs; refresh the cached ones.
      if (bucket === "site-assets") revalidateTag(SITE_CONTENT_CACHE_TAG);
      if (bucket === "sponsor-logos") revalidateTag(SPONSORS_CACHE_TAG);
    }
    return { status: "success", path: result.path, converted: result.converted };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Optimization failed." };
  }
}
