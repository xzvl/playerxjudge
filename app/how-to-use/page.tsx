import type { Metadata } from "next";
import { BookOpenCheck } from "lucide-react";

import { LegalDocumentLayout } from "@/components/legal/LegalDocumentLayout";
import { getStaticPage } from "@/lib/static-pages";
import { parseLegalBody } from "@/lib/legal-content";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "How to Use",
  description: "A guide to using PlayerXJudge — accounts, tournaments, and roles.",
};

export default async function HowToUsePage() {
  const page = await getStaticPage("how-to-use");
  const { intro, sections } = parseLegalBody(page.body);

  return (
    <LegalDocumentLayout
      icon={<BookOpenCheck className="h-7 w-7 text-primary" aria-hidden="true" />}
      eyebrow="Guide"
      title={page.title}
      subtitle={`Last updated ${formatDate(page.updated_at)}`}
      intro={intro}
      sections={sections}
    />
  );
}
