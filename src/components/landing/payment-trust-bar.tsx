import { BadgeCheck, Landmark } from "lucide-react";

const BRANDS = [
  { name: "PayToday", src: "/payment-logos/paytoday.png" },
  { name: "MTC Maris", src: "/payment-logos/mtc-maris.png" },
  { name: "FNB eWallet", src: "/payment-logos/fnb-ewallet.png" },
  { name: "PayPulse", src: "/payment-logos/paypulse.png" },
  { name: "EasyWallet", src: "/payment-logos/easywallet.png" },
  { name: "Nedbank Money", src: "/payment-logos/nedbank-money.png" },
];

export function PaymentTrustBar() {
  return (
    <section className="border-y border-border-warm bg-sand py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-terracotta">
              Local payment confidence
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-walnut">
              Accept the ways Namibians already pay.
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {BRANDS.map((brand) => (
              <span
                key={brand.name}
                className="inline-flex items-center gap-2 rounded-lg border border-border-warm bg-white py-1.5 pl-1.5 pr-3 text-sm font-extrabold text-walnut shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={brand.src} alt={`${brand.name} logo`} className="h-7 w-7 rounded-md object-contain" />
                {brand.name}
              </span>
            ))}
            <span className="inline-flex items-center gap-2 rounded-lg border border-border-warm bg-white px-3 py-2.5 text-sm font-extrabold text-walnut shadow-sm">
              <Landmark size={16} className="text-walnut-2" />
              EFT &amp; Cash on Delivery
            </span>
            <span className="inline-flex items-center gap-2 rounded-lg bg-acacia-soft px-3 py-2.5 text-sm font-extrabold text-acacia">
              <BadgeCheck size={16} />
              Zero OshiCart commission
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
