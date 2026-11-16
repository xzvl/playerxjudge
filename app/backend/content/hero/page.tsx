import type { Metadata } from "next";

import { HeroEditor } from "@/components/backend/content/SectionEditors";
import { getSiteContentFresh } from "@/lib/site-content/editor-data";

export const metadata: Metadata = { title: "Content: Hero", robots: { index: false, follow: false } };

export default async function BackendContentHeroPage() {
  const content = await getSiteContentFresh();
  return <HeroEditor initial={content.hero} />;
}
