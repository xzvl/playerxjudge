import { AccountShell } from "@/components/dashboard/AccountShell";

export default function JudgeLayout({ children }: { children: React.ReactNode }) {
  return (
    <AccountShell
      redirectTo="/account/judge/dashboard"
      gate={{ role: "judge", label: "Judge", applyHref: "/account/judge/apply", applyLabel: "Apply to be a Judge" }}
    >
      {children}
    </AccountShell>
  );
}
