import type { Metadata } from "next";

import { StaticPageEditor } from "@/components/backend/StaticPageEditor";
import { getStaticPage } from "@/lib/static-pages";
import { PageHeader } from "@/components/dashboard/erp";

export const metadata: Metadata = { title: "Privacy Policy", robots: { index: false, follow: false } };

export default async function BackendPrivacyPolicyPage() {
  const page = await getStaticPage("privacy-policy");

  return (
    <div>
      <PageHeader
        eyebrow="Backend"
        title="Privacy Policy"
        description="Edits are live on /privacy as soon as you save."
      />
      <div className="mt-5">
        <StaticPageEditor slug="privacy-policy" initialTitle={page.title} initialBody={page.body} updatedAt={page.updated_at} />
      </div>
    </div>
  );
}
