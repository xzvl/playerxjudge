import { Swords } from "lucide-react";

import { cn } from "@/lib/utils";

export function TournamentThumbnail({
  color,
  title,
  imageUrl,
  className,
}: {
  color: string;
  title: string;
  // The horizontal banner image, when the organizer has set one — falls
  // back to the color + Swords icon placeholder when absent.
  imageUrl?: string | null;
  className?: string;
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={`${title} banner`}
        className={cn("w-full overflow-hidden object-cover", className)}
      />
    );
  }

  return (
    <div
      className={cn("relative flex items-center justify-center overflow-hidden bg-surface-container", className)}
      role="img"
      aria-label={`${title} cover artwork`}
    >
      {/* Flat placeholder; the tournament's accent color tints only the icon. */}
      <Swords className="h-7 w-7 opacity-60" style={{ color }} aria-hidden="true" />
    </div>
  );
}
