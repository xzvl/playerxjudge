import { Swords } from "lucide-react";

export function TournamentThumbnail({
  color,
  title,
  className,
}: {
  color: string;
  title: string;
  className?: string;
}) {
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
