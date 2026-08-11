import type { Metadata } from "next";
import Link from "next/link";
import { Handshake } from "lucide-react";

import { PagePlaceholder } from "@/components/layout/PagePlaceholder";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sponsors",
  description: "Meet the brands sponsoring PlayerXJudge tournaments and communities.",
};

export default function SponsorsPage() {
  return (
    <PagePlaceholder
      eyebrow="Partners"
      title="Sponsors"
      description="A full sponsor directory and profile pages are coming in the next build phase."
      Icon={Handshake}
    >
      <Button asChild size="lg" tooltip="Apply to sponsor the community">
        <Link href="/become/sponsor">Become a Sponsor</Link>
      </Button>
    </PagePlaceholder>
  );
}
