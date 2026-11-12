import { AccountShell } from "@/components/dashboard/AccountShell";

export default function AccountSettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AccountShell redirectTo="/account/settings">
      {children}
    </AccountShell>
  );
}
