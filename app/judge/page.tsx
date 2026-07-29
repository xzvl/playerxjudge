import type { Metadata } from "next";
import { Gavel } from "lucide-react";

import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const metadata: Metadata = {
  title: "For Judges",
  description: "Get assigned to tournaments, record scores, and track your judging performance.",
};

export default function JudgePage() {
  return (
    <PagePlaceholder
      eyebrow="Officiate"
      title="For Judges"
      description="The scoring interface and judge assignment tools are coming in the next build phase."
      Icon={Gavel}
    />
  );
}
