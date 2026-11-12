import type { Metadata } from "next";

import { StaticPageEditor } from "@/components/backend/StaticPageEditor";
import { getStaticPage } from "@/lib/static-pages";
import { PageHeader } from "@/components/dashboard/erp";

export const metadata: Metadata = { title: "Terms & Conditions", robots: { index: false, follow: false } };

export default async function BackendTermsPage() {
  const page = await getStaticPage("terms-of-service");

  return (
    <div>
      <PageHeader
        eyebrow="Backend"
        title={<>Terms &amp; Conditions</>}
        description="Edits are live on /terms as soon as you save."
      />
      <div className="mt-5">
        <StaticPageEditor slug="terms-of-service" initialTitle={page.title} initialBody={page.body} updatedAt={page.updated_at} />
      </div>
    </div>
  );
}
