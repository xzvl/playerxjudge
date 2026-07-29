import type { Metadata } from "next";
import { HelpCircle } from "lucide-react";

import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const metadata: Metadata = {
  title: "FAQs",
  description: "Frequently asked questions about PlayerXJudge tournaments, subscriptions, and accounts.",
};

export default function FaqsPage() {
  return (
    <PagePlaceholder
      eyebrow="Help"
      title="Frequently Asked Questions"
      description="A searchable FAQ knowledge base is coming in the next build phase."
      Icon={HelpCircle}
    />
  );
}
