import { ACHIEVEMENTS } from "@/lib/mock/player-dashboard";

export function AchievementsGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {ACHIEVEMENTS.map(({ id, label, description, icon: Icon, color, achieved }) => (
        <div
          key={id}
          className="flex flex-col items-center gap-3 border border-outline-variant/25 bg-surface-container-low p-5 text-center"
        >
          <div
            className="flex h-14 w-14 items-center justify-center border transition-all"
            style={
              achieved
                ? {
                    borderColor: color,
                    backgroundColor: `${color}1a`,
                    boxShadow: `0 0 16px 2px ${color}80`,
                  }
                : { borderColor: "rgba(255,255,255,0.12)" }
            }
          >
            <Icon
              className="h-6 w-6"
              aria-hidden="true"
              style={achieved ? { color } : { color: "rgba(255,255,255,0.2)" }}
            />
          </div>
          <div>
            <p className={`label-mono ${achieved ? "text-on-surface" : "text-on-surface/30"}`}>{label}</p>
            <p className="mt-1 text-[11px] leading-snug text-on-surface/40">{description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
