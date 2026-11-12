import { AccountShell } from "@/components/dashboard/AccountShell";

// Not role-gated: any signed-in account can create or join a team.

export default function TeamDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AccountShell redirectTo="/account/team/dashboard">
      {children}
    </AccountShell>
  );
}
