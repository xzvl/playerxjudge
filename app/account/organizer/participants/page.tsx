import type { Metadata } from "next";

import { ParticipantsPanel } from "@/components/dashboard/organizer/ParticipantsPanel";

export const metadata: Metadata = { title: "Participants", robots: { index: false, follow: false } };

export default function ParticipantsPage() {
  return (
    <div>
      <p className="label-mono text-primary">Organizer Dashboard</p>
      <h1 className="heading mt-2 text-3xl">Participants</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Everyone registered across your tournaments.</p>
      <div className="mt-8">
        <ParticipantsPanel />
      </div>
    </div>
  );
}
