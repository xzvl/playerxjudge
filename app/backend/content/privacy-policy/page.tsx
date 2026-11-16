import type { Metadata } from "next";

import { StaticPageEditor } from "@/components/backend/StaticPageEditor";
import { getStaticPage } from "@/lib/static-pages";

export const metadata: Metadata = { title: "Content: Privacy Policy", robots: { index: false, follow: false } };

export default async function Page() {
  const page = await getStaticPage("privacy-policy");

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-on-surface/55">Edits are live on /privacy as soon as you save.</p>
      <StaticPageEditor slug="privacy-policy" initialTitle={page.title} initialBody={page.body} updatedAt={page.updated_at} />
    </div>
  );
}
