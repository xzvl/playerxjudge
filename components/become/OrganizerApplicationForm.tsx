"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import { applyForOrganizer } from "@/app/become/organizer/actions";
import type { OrganizerApplicationInput } from "@/lib/validations/roles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tier = OrganizerApplicationInput["tier"];

const TIERS: { value: Tier; label: string; features: string[] }[] = [
  {
    value: "free",
    label: "Free",
    features: ["Create up to 5 tournaments", "Community Profile"],
  },
  {
    value: "premium",
    label: "Premium",
    features: [
      "Unlimited tournaments",
      "Community Profile",
      "Judge Dashboard",
      "Tournament analytics",
      "Premium badge",
      "Priority listing",
      "Featured community",
      "Advanced statistics",
      "Early access to new features",
    ],
  },
];

export function OrganizerApplicationForm() {
  const [selectedTier, setSelectedTier] = useState<Tier>("free");
  const [submittingTier, setSubmittingTier] = useState<Tier | null>(null);
  const [serverMessage, setServerMessage] = useState<{ type: "error" | "success"; text: string } | null>(
    null
  );

  async function handleSubmit(tier: Tier) {
    setSelectedTier(tier);
    setSubmittingTier(tier);
    setServerMessage(null);
    const result = await applyForOrganizer({ tier });
    setSubmittingTier(null);
    if (result.status === "error") {
      setServerMessage({ type: "error", text: result.message ?? "Something went wrong." });
    } else if (result.status === "success") {
      setServerMessage({ type: "success", text: result.message ?? "Application submitted." });
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {TIERS.map((tier) => {
          const active = selectedTier === tier.value;
          return (
            <Card
              key={tier.value}
              role="button"
              tabIndex={0}
              aria-pressed={active}
              onClick={() => setSelectedTier(tier.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedTier(tier.value);
                }
              }}
              className={cn(
                "flex h-full cursor-pointer flex-col transition-colors",
                active ? "border-primary bg-primary/10" : "hover:border-outline-variant/60"
              )}
            >
              <CardHeader>
                <CardTitle className={active ? "text-primary" : undefined}>{tier.label}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <div className="flex-1 space-y-3 text-sm text-on-surface/70">
                  {tier.features.map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> {f}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  size="lg"
                  className="mt-4 w-full"
                  variant={active ? "default" : "outline"}
                  tooltip={`Apply for the ${tier.label} organizer tier`}
                  disabled={submittingTier !== null}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleSubmit(tier.value);
                  }}
                >
                  {submittingTier === tier.value ? "Submitting..." : "Submit Application"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {serverMessage ? (
        <p
          role={serverMessage.type === "error" ? "alert" : "status"}
          className={serverMessage.type === "error" ? "text-sm text-destructive" : "text-sm text-primary"}
        >
          {serverMessage.text}
        </p>
      ) : null}
    </div>
  );
}
