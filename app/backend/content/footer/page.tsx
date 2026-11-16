import type { Metadata } from "next";

import { FooterEditor } from "@/components/backend/content/SectionEditors";
import { getSiteContentFresh } from "@/lib/site-content/editor-data";

export const metadata: Metadata = { title: "Content: Footer", robots: { index: false, follow: false } };

export default async function BackendContentFooterPage() {
  const content = await getSiteContentFresh();
  return <FooterEditor initial={content.footer} />;
}
