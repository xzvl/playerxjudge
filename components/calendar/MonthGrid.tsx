import { cn } from "@/lib/utils";
import type { MockTournament } from "@/lib/mock/tournaments";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE_PER_DAY = 3;

interface GridDay {
  year: number;
  month: number;
  day: number;
  inCurrentMonth: boolean;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function buildGridDays(year: number, month: number): GridDay[] {
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const daysInPrevMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  const cells: GridDay[] = [];
  for (let i = firstWeekday - 1; i >= 0; i--) {
    cells.push({ year: prevYear, month: prevMonth, day: daysInPrevMonth - i, inCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ year, month, day: d, inCurrentMonth: true });
  }
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ year: nextYear, month: nextMonth, day: nextDay, inCurrentMonth: false });
    nextDay++;
  }
  return cells;
}

export function MonthGrid({
  year,
  month,
  tournamentsByDate,
  todayKey,
  onSelectTournament,
}: {
  year: number;
  month: number;
  tournamentsByDate: Map<string, MockTournament[]>;
  todayKey: string;
  onSelectTournament: (id: string) => void;
}) {
  const cells = buildGridDays(year, month);

  return (
    <div className="border border-outline-variant/25 bg-surface-container-lowest">
      <div className="grid grid-cols-7 border-b border-outline-variant/25">
        {WEEKDAYS.map((day) => (
          <div key={day} className="label-mono p-3 text-center text-on-surface/40">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          const key = dateKey(cell.year, cell.month, cell.day);
          const isToday = key === todayKey;
          const dayTournaments = tournamentsByDate.get(key) ?? [];
          const visible = dayTournaments.slice(0, MAX_VISIBLE_PER_DAY);
          const overflow = dayTournaments.length - visible.length;

          return (
            <div
              key={`${key}-${i}`}
              className={cn(
                "min-h-[104px] border-b border-r border-outline-variant/15 p-2",
                i % 7 === 6 && "border-r-0",
                !cell.inCurrentMonth && "bg-surface-container-low/40"
              )}
            >
              <span
                className={cn(
                  "label-mono inline-flex h-6 w-6 items-center justify-center text-[11px]",
                  cell.inCurrentMonth ? "text-on-surface/60" : "text-on-surface/25",
                  isToday && "bg-primary text-on-primary"
                )}
              >
                {cell.day}
              </span>
              <div className="mt-1 space-y-1">
                {visible.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onSelectTournament(t.id)}
                    className="flex w-full items-center gap-1.5 border-l-2 bg-surface-container-low px-1.5 py-1 text-left text-[10px] leading-tight text-on-surface/70 transition-colors hover:bg-surface-container-high"
                    style={{ borderColor: t.thumbnailColor }}
                  >
                    <span className="line-clamp-1">{t.title}</span>
                  </button>
                ))}
                {overflow > 0 ? (
                  <p className="px-1.5 text-[10px] text-on-surface/40">+{overflow} more</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
