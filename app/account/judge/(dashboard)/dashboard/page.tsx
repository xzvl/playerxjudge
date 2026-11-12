import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Building2, CheckCircle2, Clock3, ListChecks, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { KpiCard, KpiGrid, PageHeader, Panel } from "@/components/dashboard/erp";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { RoleStatusBadge } from "@/components/roles/RoleStatusBadge";
import { requestCommunityJudgeAssignment, withdrawCommunityJudgeRequest } from "@/app/account/judge/(dashboard)/dashboard/actions";
import type { CommunityJudge } from "@/lib/types/database";

export const metadata: Metadata = { title: "Judge Dashboard", robots: { index: false, follow: false } };

const TOOLS = [
  {
    label: "Assigned Tournaments",
    description: "Tournaments you've been invited to judge, confirmed and pending.",
    href: "/account/judge/assigned-tournaments",
    icon: ListChecks,
  },
  {
    label: "Judge Profile",
    description: "Upload your BeyZ ID and check your Certified Judge status.",
    href: "/account/judge/profile",
    icon: BadgeCheck,
  },
];

export default async function JudgeDashboardPage() {
  let communities: { id: string; name: string }[] = [];
  let assignments: CommunityJudge[] = [];

  if (isSupabaseConfigured) {
    const user = await getCurrentUser();
    const supabase = await createClient();
    const [{ data: communitiesData }, { data: assignmentsData }] = await Promise.all([
      supabase.from("communities").select("id, name").order("name"),
      supabase.from("community_judges").select("*").eq("judge_id", user?.id ?? ""),
    ]);
    communities = communitiesData ?? [];
    assignments = (assignmentsData as CommunityJudge[] | null) ?? [];
  }

  const approvedCount = assignments.filter((a) => a.status === "approved").length;
  const pendingCount = assignments.filter((a) => a.status === "pending").length;

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Judge" title="Judge Dashboard" description="Your assigned tournaments and scoring tools will appear here." />

      <KpiGrid className="xl:grid-cols-3">
        <KpiCard label="Approved communities" value={approvedCount} icon={CheckCircle2} emphasis hint="You can judge their events" />
        <KpiCard label="Pending requests" value={pendingCount} icon={Clock3} hint="Awaiting organizer approval" />
        <KpiCard label="Registered communities" value={communities.length} icon={Building2} hint="Available to request" />
      </KpiGrid>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title="Communities to Judge" icon={Settings} meta={`${communities.length} total`} className="lg:col-span-2" bodyClassName="p-0">
          {communities.length === 0 ? (
            <p className="p-4 text-sm text-on-surface/50">No communities are registered yet.</p>
          ) : (
            <ul className="divide-y divide-outline-variant/15">
              {communities.map((community) => {
                const assignment = assignments.find((a) => a.community_id === community.id);
                return (
                  <li
                    key={community.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-primary/[0.04]"
                  >
                    <span className="text-sm text-on-surface">{community.name}</span>
                    <div className="flex items-center gap-3">
                      {assignment ? (
                        <>
                          <RoleStatusBadge status={assignment.status === "removed" ? "rejected" : assignment.status} />
                          <form action={withdrawCommunityJudgeRequest.bind(null, community.id)}>
                            <Button type="submit" size="sm" variant="outline" tooltip="Withdraw this judge request">
                              Withdraw
                            </Button>
                          </form>
                        </>
                      ) : (
                        <form action={requestCommunityJudgeAssignment.bind(null, community.id)}>
                          <Button type="submit" size="sm" variant="outline" tooltip="Request to judge this community">
                            Request
                          </Button>
                        </form>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="More Tools" icon={ListChecks} bodyClassName="p-2">
          <nav className="flex flex-col">
            {TOOLS.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="group rounded-md px-2 py-2 transition-colors hover:bg-surface-container"
              >
                <span className="flex items-center gap-2.5 text-[13px] font-medium text-on-surface/85 group-hover:text-on-surface">
                  <tool.icon className="h-4 w-4 text-on-surface/40 transition-colors group-hover:text-primary" aria-hidden="true" />
                  {tool.label}
                </span>
                <span className="mt-0.5 block pl-[26px] text-xs text-on-surface/45">{tool.description}</span>
              </Link>
            ))}
          </nav>
        </Panel>
      </div>
    </div>
  );
}
