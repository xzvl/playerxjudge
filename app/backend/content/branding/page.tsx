import type { Metadata } from "next";

import { BrandingEditor } from "@/components/backend/content/SectionEditors";
import { getSiteContentFresh } from "@/lib/site-content/editor-data";

export const metadata: Metadata = { title: "Content: Branding", robots: { index: false, follow: false } };

export default async function BackendContentBrandingPage() {
  const content = await getSiteContentFresh();
  return <BrandingEditor initial={content.branding} />;
}
