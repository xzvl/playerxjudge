import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import Link from "next/link";

import { PagePlaceholder } from "@/components/layout/PagePlaceholder";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "For Organizers",
  description: "Run Beyblade X tournaments with registration, brackets, check-in, and analytics tools.",
};

export default function OrganizerPage() {
  return (
    <PagePlaceholder
      eyebrow="Organize"
      title="For Organizers"
      description="Tournament creation, bracket generation, and organizer analytics are coming in the next build phase."
      Icon={ClipboardList}
    >
      <Button asChild size="lg">
        <Link href="/join-community">Register Your Community</Link>
      </Button>
    </PagePlaceholder>
  );
}
