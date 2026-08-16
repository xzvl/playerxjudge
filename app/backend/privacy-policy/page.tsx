import type { Metadata } from "next";

import { StaticPageEditor } from "@/components/backend/StaticPageEditor";
import { getStaticPage } from "@/lib/static-pages";

export const metadata: Metadata = { title: "Privacy Policy", robots: { index: false, follow: false } };

export default async function BackendPrivacyPolicyPage() {
  const page = await getStaticPage("privacy-policy");

  return (
    <div>
      <p className="label-mono text-primary">Backend</p>
      <h1 className="heading mt-2 text-3xl">Privacy Policy</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Edits are live on /privacy as soon as you save.</p>
      <div className="mt-8">
        <StaticPageEditor slug="privacy-policy" initialTitle={page.title} initialBody={page.body} updatedAt={page.updated_at} />
      </div>
    </div>
  );
}
