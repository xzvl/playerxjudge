import type { Metadata } from "next";

import { StaticPageEditor } from "@/components/backend/StaticPageEditor";
import { getStaticPage } from "@/lib/static-pages";

export const metadata: Metadata = { title: "Content: How to Use", robots: { index: false, follow: false } };

export default async function Page() {
  const page = await getStaticPage("how-to-use");

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-on-surface/55">Edits are live on /how-to-use as soon as you save.</p>
      <StaticPageEditor slug="how-to-use" initialTitle={page.title} initialBody={page.body} updatedAt={page.updated_at} />
    </div>
  );
}
