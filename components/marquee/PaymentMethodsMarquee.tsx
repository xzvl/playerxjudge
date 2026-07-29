import { Marquee } from "@/components/marquee/Marquee";

const PAYMENT_METHODS = ["GCash", "Maya", "Visa", "Mastercard", "Bank Transfer"];

export function PaymentMethodsMarquee() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-[1440px] px-4 md:px-16">
        <div className="mb-8 text-center">
          <h2 className="heading text-2xl md:text-3xl">Accepted Payment Methods</h2>
          <p className="mt-2 text-sm text-on-surface/60">
            Secure monthly subscription payments.
          </p>
        </div>
        <Marquee>
          {PAYMENT_METHODS.map((method) => (
            <span
              key={method}
              className="glass-panel label-mono shrink-0 px-8 py-4 text-on-surface/70"
            >
              {method}
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
