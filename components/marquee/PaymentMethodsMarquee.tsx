import { CreditCard } from "lucide-react";

import { Marquee } from "@/components/marquee/Marquee";

const PAYMENT_METHODS = ["GCash", "Maya", "Visa", "Mastercard", "Bank Transfer"];

export function PaymentMethodsMarquee() {
  return (
    <section className="border-t border-outline-variant/20 py-12">
      <div className="mx-auto max-w-[1280px] px-4 md:px-6">
        <div className="mb-5 text-center">
          <h2 className="heading text-lg">Accepted payment methods</h2>
          <p className="mt-1 text-[13px] text-on-surface/55">Secure monthly subscription payments.</p>
        </div>
        <Marquee>
          {PAYMENT_METHODS.map((method) => (
            <span
              key={method}
              className="inline-flex items-center gap-2 rounded-md border border-outline-variant/25 bg-surface-container-low px-3 py-1.5 text-[13px] text-on-surface/75"
            >
              <CreditCard className="h-3.5 w-3.5 text-on-surface/45" aria-hidden="true" />
              {method}
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
