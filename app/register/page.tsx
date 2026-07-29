import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth/AuthCard";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Join PlayerXJudge to register for Beyblade X tournaments, join a community, and track your stats.",
};

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create Account"
      subtitle="Join the PlayerXJudge community."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
