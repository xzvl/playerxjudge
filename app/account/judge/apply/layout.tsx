import { AccountShell } from "@/components/dashboard/AccountShell";

// Deliberately outside app/account/judge/(dashboard)'s approved-judge gate:
// this is the page a non-judge reaches from the sidebar's "Apply Judge" item.

export default function JudgeApplyLayout({ children }: { children: React.ReactNode }) {
  return (
    <AccountShell redirectTo="/account/judge/apply">
      {children}
    </AccountShell>
  );
}
