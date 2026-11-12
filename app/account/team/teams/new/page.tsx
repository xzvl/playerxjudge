import type { Metadata } from "next";

import { PageHeader, Panel } from "@/components/dashboard/erp";
import { TeamForm } from "@/components/dashboard/team/TeamForm";

export const metadata: Metadata = { title: "New Team", robots: { index: false, follow: false } };

export default function NewTeamPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        back={{ href: "/account/team/teams", label: "Teams" }}
        title="Create a team"
        description="You'll be the team captain. You can add a logo and cover image after it's created."
      />
      <Panel title="Team details" className="max-w-2xl">
        <TeamForm />
      </Panel>
    </div>
  );
}
