import type { Metadata } from "next";

import { StaticPageEditor } from "@/components/backend/StaticPageEditor";
import { getStaticPage } from "@/lib/static-pages";
import { PageHeader } from "@/components/dashboard/erp";

export const metadata: Metadata = { title: "How to Use", robots: { index: false, follow: false } };

export default async function BackendHowToUsePage() {
  const page = await getStaticPage("how-to-use");

  return (
    <div>
      <PageHeader
        eyebrow="Backend"
        title="How to Use"
        description="Edits are live on /how-to-use as soon as you save."
      />
      <div className="mt-5">
        <StaticPageEditor slug="how-to-use" initialTitle={page.title} initialBody={page.body} updatedAt={page.updated_at} />
      </div>
    </div>
  );
}
