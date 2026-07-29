import type { Metadata } from "next";
import { FileText } from "lucide-react";

import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "PlayerXJudge terms and conditions of use.",
};

export default function TermsPage() {
  return (
    <PagePlaceholder
      eyebrow="Legal"
      title="Terms & Conditions"
      description="Full legal terms are being finalized and will be published here before launch."
      Icon={FileText}
    />
  );
}
