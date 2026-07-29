import type { Metadata } from "next";
import Link from "next/link";
import { Check, Users2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Join / Register Community",
  description: "Compare Free and Premium plans and register your Beyblade X community on PlayerXJudge.",
};

const FREE_FEATURES = ["Create maximum 2 tournaments", "Player Dashboard", "Community Profile"];
const PREMIUM_FEATURES = [
  "Unlimited tournaments",
  "Judge Dashboard",
  "Tournament analytics",
  "Premium badge",
  "Priority listing",
  "Featured community",
  "Sponsor priority",
  "Advanced statistics",
  "Early access to new features",
];

export default function JoinCommunityPage() {
  return (
    <div className="cyber-grid px-4 py-20 md:px-16">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <div className="glass-panel mx-auto flex h-16 w-16 items-center justify-center">
            <Users2 className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <p className="label-mono mt-6 text-primary">Register</p>
          <h1 className="heading mt-3 text-4xl md:text-5xl">Join PlayerXJudge</h1>
          <p className="mx-auto mt-4 max-w-xl text-on-surface/60">
            Register your community and choose the plan that fits your tournament ambitions.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Free</CardTitle>
              <p className="text-2xl font-black text-on-surface">₱0</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3 text-sm text-on-surface/70">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="w-full">
                <Link href="/register">Start Free</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary/50">
            <CardHeader>
              <CardTitle>
                Premium <span className="text-primary">★</span>
              </CardTitle>
              <p className="text-2xl font-black text-on-surface">
                ₱100<span className="text-sm font-normal text-on-surface/50">/month</span>
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3 text-sm text-on-surface/70">
                {PREMIUM_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button asChild className="w-full">
                <Link href="/register">Go Premium</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
