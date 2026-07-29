export function Marquee({ children }: { children: React.ReactNode }) {
  return (
    <div className="scrollbar-none relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <div className="flex w-max animate-marquee items-center gap-16 motion-reduce:animate-none">
        {children}
        {children}
      </div>
    </div>
  );
}
