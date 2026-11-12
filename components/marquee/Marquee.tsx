// A centered, wrapping row of logos/chips. (Formerly an auto-scrolling
// marquee; kept under the same name so callers don't change. Static rows
// read faster and drop the edge-fade and continuous motion.)
export function Marquee({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">{children}</div>;
}
