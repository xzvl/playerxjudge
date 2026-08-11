import type { Metadata } from "next";

import { RegisteredTournamentsPanel } from "@/components/dashboard/player/RegisteredTournamentsPanel";

export const metadata: Metadata = { title: "Registered Tournaments", robots: { index: false, follow: false } };

export default function RegisteredTournamentsPage() {
  return (
    <div>
      <p className="label-mono text-primary">Player Dashboard</p>
      <h1 className="heading mt-2 text-3xl">Registered Tournaments</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">
        Tournaments you&apos;ve registered for, past and present.
      </p>
      <div className="mt-8">
        <RegisteredTournamentsPanel />
      </div>
    </div>
  );
}
