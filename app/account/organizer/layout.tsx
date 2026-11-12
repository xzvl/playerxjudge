import { AccountShell } from "@/components/dashboard/AccountShell";

export default function OrganizerDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AccountShell
      redirectTo="/account/organizer/dashboard"
      gate={{ role: "organizer", label: "Organizer", applyHref: "/become/organizer", applyLabel: "Apply to Organize" }}
    >
      {children}
    </AccountShell>
  );
}
