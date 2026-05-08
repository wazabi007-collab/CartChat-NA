import Link from "next/link";
import { ArrowRight, BotMessageSquare, Check, Store } from "lucide-react";

const TIERS = [
  {
    name: "Oshi-Storefront",
    price: "N$149",
    cadence: "/ month",
    audience: "For vendors, home businesses, and small shops",
    cta: "Start Storefront",
    href: "/signup?tier=oshi_basic",
    highlighted: false,
    icon: Store,
    features: [
      "50 products",
      "300 orders/month",
      "OshiCart store link",
      "Local payment methods",
      "Proof-of-payment upload",
      "Manual WhatsApp order handoff",
    ],
  },
  {
    name: "Oshi-Automate",
    price: "N$399",
    cadence: "/ month",
    audience: "For growing sellers who want automated customer updates",
    cta: "Start Automate",
    href: "/signup?tier=oshi_grow",
    highlighted: true,
    icon: BotMessageSquare,
    features: [
      "200 products",
      "1,000 orders/month",
      "Automated WhatsApp order updates",
      "Automated confirmed, ready, completed messages",
      "Inventory tracking and coupons",
      "Analytics and branding removal",
    ],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="bg-sand py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-terracotta">
            Simple pricing
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-walnut sm:text-4xl">
            Two clear plans: launch your store or automate your WhatsApp.
          </h2>
          <p className="mt-3 text-base leading-7 text-walnut-2">
            OshiCart should stay local, simple, and affordable while charging
            properly for automation where it creates real value.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-2">
          {TIERS.map((tier) => {
            const Icon = tier.icon;
            return (
              <div
                key={tier.name}
                className={`relative rounded-2xl border bg-white p-6 ${
                  tier.highlighted
                    ? "border-terracotta shadow-xl shadow-terracotta/10 ring-2 ring-terracotta"
                    : "border-border-warm shadow-sm"
                }`}
              >
                {tier.highlighted && (
                  <span className="absolute -top-3 left-6 rounded-full bg-terracotta px-3 py-1 text-xs font-black text-white">
                    Best for automation
                  </span>
                )}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black text-walnut">
                      {tier.name}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-walnut-2">
                      {tier.audience}
                    </p>
                  </div>
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-terracotta-soft text-terracotta">
                    <Icon size={24} />
                  </span>
                </div>
                <div className="mt-6 flex items-end gap-1">
                  <span className="text-5xl font-black tracking-tight text-walnut">
                    {tier.price}
                  </span>
                  <span className="pb-1 text-sm font-bold text-walnut-2">
                    {tier.cadence}
                  </span>
                </div>
                <ul className="mt-6 space-y-3">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm font-semibold leading-5 text-walnut-2"
                    >
                      <Check size={16} className="mt-0.5 shrink-0 text-acacia" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.href}
                  className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-black transition ${
                    tier.highlighted
                      ? "bg-terracotta text-white hover:bg-[#234B86]"
                      : "bg-walnut text-white hover:bg-[#1d2a3c]"
                  }`}
                >
                  {tier.cta} <ArrowRight size={16} />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
