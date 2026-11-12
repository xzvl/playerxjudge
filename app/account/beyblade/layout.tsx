import { AccountShell } from "@/components/dashboard/AccountShell";

// Not role-gated: every signed-in account can save combos and build a deck.

export default function BeybladeDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AccountShell redirectTo="/account/beyblade/dashboard">
      {children}
    </AccountShell>
  );
}
