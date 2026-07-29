import type { Metadata } from "next";
import { BookOpenCheck } from "lucide-react";

import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const metadata: Metadata = {
  title: "Beyblade Rules",
  description: "Official and community Beyblade X battle rules and formats.",
};

export default function RulesPage() {
  return (
    <PagePlaceholder
      eyebrow="Reference"
      title="Beyblade X Rules"
      description="A full rules reference and battle-format glossary is coming in the next build phase."
      Icon={BookOpenCheck}
    />
  );
}
