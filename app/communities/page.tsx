import type { Metadata } from "next";
import { Users2 } from "lucide-react";

import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const metadata: Metadata = {
  title: "Communities",
  description: "Discover Beyblade X communities near you, their members, events, and sponsors.",
};

export default function CommunitiesPage() {
  return (
    <PagePlaceholder
      eyebrow="Discover"
      title="Communities"
      description="Community directory, profiles, and events are coming in the next build phase."
      Icon={Users2}
    />
  );
}
