import { Swords } from "lucide-react";

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
        className={`w-full overflow-hidden object-cover ${className ?? ""}`}
      />
    );
  }

  return (
    <div
      className={`cyber-grid relative flex items-center justify-center overflow-hidden bg-surface-container-lowest ${className ?? ""}`}
      style={{ boxShadow: `inset 0 0 60px ${color}22` }}
      role="img"
      aria-label={`${title} cover artwork`}
    >
      <Swords className="h-10 w-10" style={{ color }} aria-hidden="true" />
    </div>
  );
}
