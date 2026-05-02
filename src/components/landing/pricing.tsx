import Link from "next/link";

const TIERS = [
  {
    name: "Free",
    price: "N$0",
    cadence: "/ month",
    highlighted: false,
    cta: "Open free store",
    features: [
      "Up to 10 products",
      "Oshicart subdomain (oshicart.com/s/your-store)",
      "WhatsApp orders",
      "PayToday + EFT + eWallet + Cash on Delivery",
      "Mobile-first storefront",
    ],
  },
  {
    name: "Pro",
    price: "N$149.95",
    cadence: "/ month",
    highlighted: true,
    cta: "Start Pro",
    features: [
      "Up to 50 products",
      "Everything in Free",
    ],
  },
  {
    name: "Business",
    price: "N$399.95",
    cadence: "/ month",
    highlighted: false,
    cta: "Start Business",
    features: [
      "200+ products",
      "Multi-staff accounts",
      "Advanced analytics",
      "Everything in Pro",
    ],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-20 bg-sand">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-12">
          <p className="text-[11px] tracking-[0.12em] font-bold text-terracotta mb-2">
            PRICING
          </p>
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-walnut">
            Start free. Upgrade when you grow.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`rounded-2xl bg-white p-7 flex flex-col ${
                t.highlighted
                  ? "border-2 border-terracotta shadow-lg relative"
                  : "border border-border-warm"
              }`}
            >
              {t.highlighted && (
                <span className="absolute -top-3 left-7 inline-block bg-terracotta text-white text-[10px] tracking-[0.1em] font-bold px-2.5 py-1 rounded-full">
                  MOST POPULAR
                </span>
              )}
              <h3 className="text-xl font-bold text-walnut">{t.name}</h3>
              <p className="mt-2 text-3xl font-extrabold text-walnut">
                {t.price}
                <span className="text-sm font-normal text-walnut-2 ml-1">
                  {t.cadence}
                </span>
              </p>
              <ul className="mt-6 mb-8 space-y-2 text-sm text-walnut-2">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-acacia font-bold mt-0.5">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`mt-auto inline-flex items-center justify-center px-4 py-2.5 rounded-lg font-semibold text-sm transition ${
                  t.highlighted
                    ? "bg-terracotta text-white hover:opacity-90"
                    : "bg-walnut text-sand hover:opacity-90"
                }`}
              >
                {t.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
