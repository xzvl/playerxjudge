import type { Metadata } from "next";
import { Check, Handshake } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Become a Sponsor",
  description: "Explore Bronze, Silver, and Gold sponsor packages for Beyblade X communities and tournaments.",
};

const PACKAGES = [
  {
    name: "Bronze",
    features: ["Logo on community page", "Sponsor directory"],
  },
  {
    name: "Silver",
    features: [
      "Homepage sponsor section",
      "Tournament sponsor badge",
      "Social media mention",
    ],
  },
  {
    name: "Gold",
    features: [
      "Featured homepage",
      "Priority sponsor placement",
      "Website backlink",
      "Event banners",
      "Marketing analytics",
      "Community newsletter feature",
    ],
  },
];

export default function BecomeSponsorPage() {
  return (
    <div className="cyber-grid px-4 py-20 md:px-16">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <div className="glass-panel mx-auto flex h-16 w-16 items-center justify-center">
            <Handshake className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <p className="label-mono mt-6 text-primary">Partner With Us</p>
          <h1 className="heading mt-3 text-4xl md:text-5xl">Become a Sponsor</h1>
          <p className="mx-auto mt-4 max-w-xl text-on-surface/60">
            Put your brand in front of the Beyblade X community with a sponsor package built for
            your goals.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {PACKAGES.map((pkg) => (
            <Card key={pkg.name} className={pkg.name === "Gold" ? "border-primary/50" : undefined}>
              <CardHeader>
                <CardTitle>{pkg.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3 text-sm text-on-surface/70">
                  {pkg.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button variant={pkg.name === "Gold" ? "default" : "outline"} className="w-full">
                  Contact Us
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
