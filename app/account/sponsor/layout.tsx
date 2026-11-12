import { AccountShell } from "@/components/dashboard/AccountShell";

export default function SponsorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AccountShell
      redirectTo="/account/sponsor/dashboard"
      gate={{ role: "sponsor", label: "Sponsor", applyHref: "/become/sponsor", applyLabel: "Apply to Sponsor" }}
    >
      {children}
    </AccountShell>
  );
}
