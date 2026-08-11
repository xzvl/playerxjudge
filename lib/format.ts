const PH_TIME_ZONE = "Asia/Manila";

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: PH_TIME_ZONE,
  }).format(new Date(iso));
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: PH_TIME_ZONE,
  }).format(new Date(iso));
}

export function formatCurrency(amount: number) {
  if (amount === 0) return "Free Entry";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(value);
}

// Philippines has no DST, so "Manila wall time" is always a fixed UTC+8
// offset — no timezone library needed to convert `datetime-local` input
// values (which are timezone-naive) to/from real instants.
const MANILA_OFFSET_MINUTES = 8 * 60;

// "2026-08-20T10:00" (as typed into a Manila-labeled datetime-local input)
// -> the real UTC instant it represents, as an ISO string.
export function manilaLocalToUtcIso(localValue: string) {
  const [datePart, timePart] = localValue.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = (timePart ?? "00:00").split(":").map(Number);
  const utcMs = Date.UTC(year, month - 1, day, hour, minute) - MANILA_OFFSET_MINUTES * 60_000;
  return new Date(utcMs).toISOString();
}

// The inverse: a UTC ISO timestamp -> the "2026-08-20T10:00" string a
// datetime-local input showing Manila time should display.
export function utcIsoToManilaLocal(iso: string) {
  const manilaMs = new Date(iso).getTime() + MANILA_OFFSET_MINUTES * 60_000;
  const d = new Date(manilaMs);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

// "YYYY-MM-DD" in Asia/Manila, for grouping ISO timestamps by calendar day.
export function dateKeyManila(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: PH_TIME_ZONE,
  }).format(new Date(iso));
}

export function dateKeyLocal(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
