import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

import { LegalDocumentLayout } from "@/components/legal/LegalDocumentLayout";
import { getStaticPage } from "@/lib/static-pages";
import { parseLegalBody } from "@/lib/legal-content";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How PlayerXJudge collects, uses, and protects your data.",
};

export default async function PrivacyPage() {
  const page = await getStaticPage("privacy-policy");
  const { intro, sections } = parseLegalBody(page.body);

  return (
    <LegalDocumentLayout
      icon={<ShieldCheck className="h-7 w-7 text-primary" aria-hidden="true" />}
      eyebrow="Legal"
      title={page.title}
      subtitle={`Last updated ${formatDate(page.updated_at)}`}
      intro={intro}
      sections={sections}
    />
  );
}
