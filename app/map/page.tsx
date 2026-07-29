import type { Metadata } from "next";
import { MapPin } from "lucide-react";

import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const metadata: Metadata = {
  title: "Tournament Map",
  description: "Explore every upcoming Beyblade X tournament and community on an interactive map.",
};

export default function MapPage() {
  return (
    <PagePlaceholder
      eyebrow="Explore"
      title="Interactive Tournament Map"
      description="Leaflet + OpenStreetMap tournament and community map wiring is coming in the next build phase."
      Icon={MapPin}
    />
  );
}
