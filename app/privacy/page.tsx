import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How PlayerXJudge collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <PagePlaceholder
      eyebrow="Legal"
      title="Privacy Policy"
      description="Our full privacy policy is being finalized and will be published here before launch."
      Icon={ShieldCheck}
    />
  );
}
