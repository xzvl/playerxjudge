import type { Metadata } from "next";
import { Settings } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { RoleStatusBadge } from "@/components/roles/RoleStatusBadge";
import { requestCommunityJudgeAssignment, withdrawCommunityJudgeRequest } from "@/app/account/judge/dashboard/actions";
import type { CommunityJudge } from "@/lib/types/database";

export const metadata: Metadata = { title: "Judge Dashboard", robots: { index: false, follow: false } };

const OTHER_FEATURES = ["Assigned Tournaments", "Scoring Interface", "Match History", "Performance", "Leaderboard"];

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

  return (
    <div className="space-y-10">
      <div>
        <h1 className="heading text-2xl">Judge Dashboard</h1>
        <p className="mt-2 max-w-xl text-sm text-on-surface/60">
          Your assigned tournaments and scoring tools will appear here.
        </p>
      </div>

      <section>
        <h2 className="label-mono mb-4 flex items-center gap-2 text-primary">
          <Settings className="h-4 w-4" aria-hidden="true" /> Communities to Judge
        </h2>
        <Card>
          <CardContent className="space-y-3 pt-6">
            {communities.length === 0 ? (
              <p className="text-sm text-on-surface/50">No communities are registered yet.</p>
            ) : (
              communities.map((community) => {
                const assignment = assignments.find((a) => a.community_id === community.id);
                return (
                  <div
                    key={community.id}
                    className="flex flex-wrap items-center justify-between gap-3 border border-outline-variant/25 p-4"
                  >
                    <span className="text-sm text-on-surface">{community.name}</span>
                    <div className="flex items-center gap-3">
                      {assignment ? (
                        <>
                          <RoleStatusBadge
                            status={assignment.status === "removed" ? "rejected" : assignment.status}
                          />
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
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="label-mono mb-4 text-on-surface/40">More Tools</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {OTHER_FEATURES.map((feature) => (
            <Card key={feature}>
              <CardHeader>
                <CardTitle className="text-base">{feature}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-on-surface/50">Coming in the next build phase.</CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
