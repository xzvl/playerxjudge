import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";

import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const metadata: Metadata = {
  title: "Calendar",
  description: "See every upcoming Beyblade X tournament on a full calendar view.",
};

export default function CalendarPage() {
  return (
    <PagePlaceholder
      eyebrow="Plan Ahead"
      title="Tournament Calendar"
      description="A FullCalendar-powered event calendar is coming in the next build phase."
      Icon={CalendarDays}
    />
  );
}
