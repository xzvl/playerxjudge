import { AccountShell } from "@/components/dashboard/AccountShell";

export default function PlayerDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AccountShell redirectTo="/account/player/dashboard">
      {children}
    </AccountShell>
  );
}
