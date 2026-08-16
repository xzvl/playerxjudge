import type { Metadata } from "next";

import { StaticPageEditor } from "@/components/backend/StaticPageEditor";
import { getStaticPage } from "@/lib/static-pages";

export const metadata: Metadata = { title: "How to Use", robots: { index: false, follow: false } };

export default async function BackendHowToUsePage() {
  const page = await getStaticPage("how-to-use");

  return (
    <div>
      <p className="label-mono text-primary">Backend</p>
      <h1 className="heading mt-2 text-3xl">How to Use</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Edits are live on /how-to-use as soon as you save.</p>
      <div className="mt-8">
        <StaticPageEditor slug="how-to-use" initialTitle={page.title} initialBody={page.body} updatedAt={page.updated_at} />
      </div>
    </div>
  );
}
