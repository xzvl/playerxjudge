import type { Metadata } from "next";

import { HeaderEditor } from "@/components/backend/content/SectionEditors";
import { getSiteContentFresh } from "@/lib/site-content/editor-data";

export const metadata: Metadata = { title: "Content: Header", robots: { index: false, follow: false } };

export default async function BackendContentHeaderPage() {
  const content = await getSiteContentFresh();
  return <HeaderEditor initial={content.header} />;
}
