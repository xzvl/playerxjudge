import { ArrowUpRight, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const SHOP_URL = "https://xzvl.store/";

// Compact "Shop" button for the header and menus.
export function ShopButton({ className, onClick }: { className?: string; onClick?: () => void }) {
  return (
    <Button asChild size="sm" className={cn("uppercase tracking-[0.08em]", className)}>
      <a href={SHOP_URL} target="_blank" rel="noopener noreferrer" onClick={onClick}>
        <ShoppingBag /> Shop now
      </a>
    </Button>
  );
}

// Full-width call-to-action band (home page).
export function ShopBanner({ className }: { className?: string }) {
  return (
    <section className={cn("mx-auto w-full max-w-[1280px] px-4 py-8 md:px-6", className)}>
      <div className="chamfer relative overflow-hidden border border-primary/40 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent p-6 md:p-10">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/25 blur-3xl"
        />
        <div className="relative flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="label-mono text-primary">XZVL Store</p>
            <h2 className="heading mt-1 text-3xl md:text-4xl">Buy your own Beyblade</h2>
            <p className="mt-2 max-w-xl text-base text-on-surface/65">
              Gear up with genuine Beyblade X blades, ratchets, bits and launchers, ready for your next tournament.
            </p>
          </div>
          <Button asChild size="lg" className="w-full shrink-0 md:w-auto">
            <a href={SHOP_URL} target="_blank" rel="noopener noreferrer">
              Shop now <ArrowUpRight />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
