import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/AuthCard";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Reset Password" subtitle="We'll email you a secure link.">
      <ResetPasswordForm />
    </AuthCard>
  );
}
