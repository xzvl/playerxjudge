import type { Metadata } from "next";

import { CalendarView } from "@/components/calendar/CalendarView";

export const metadata: Metadata = {
  title: "Calendar",
  description: "See every upcoming Beyblade X tournament on a full calendar view.",
};

export default function CalendarPage() {
  return <CalendarView />;
}
