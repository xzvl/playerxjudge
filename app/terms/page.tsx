import type { Metadata } from "next";
import { FileText } from "lucide-react";

import { LegalDocumentLayout } from "@/components/legal/LegalDocumentLayout";
import { getStaticPage } from "@/lib/static-pages";
import { parseLegalBody } from "@/lib/legal-content";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "PlayerXJudge terms and conditions of use.",
};

export default async function TermsPage() {
  const page = await getStaticPage("terms-of-service");
  const { intro, sections } = parseLegalBody(page.body);

  return (
    <LegalDocumentLayout
      icon={<FileText className="h-7 w-7 text-primary" aria-hidden="true" />}
      eyebrow="Legal"
      title={page.title}
      subtitle={`Last updated ${formatDate(page.updated_at)}`}
      notice={{
        title: "Important Notice",
        body: "By creating an account, pre-registering for a tournament, or applying for a role on PlayerXJudge, you agree to these Terms and to the Beyblade X Regulations enforced at every event.",
      }}
      intro={intro}
      sections={sections}
    />
  );
}
