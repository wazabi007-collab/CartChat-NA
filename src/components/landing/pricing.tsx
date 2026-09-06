import Link from "next/link";
import { ArrowRight, BotMessageSquare, Check, Rocket, Store, type LucideIcon } from "lucide-react";
import { PUBLIC_PLANS, type PlanIconKey } from "@/lib/plans";

const ICONS: Record<PlanIconKey, LucideIcon> = {
  store: Store,
  automate: BotMessageSquare,
  pro: Rocket,
};

export function Pricing() {
  return (
    <section id="pricing" className="bg-sand py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-terracotta">
            Simple pricing
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-walnut sm:text-4xl">
            Plans that scale with your store.
          </h2>
          <p className="mt-3 text-base leading-7 text-walnut-2">
            Create your store with a 30-day trial. Choose the plan that fits
            your catalogue, order volume and automation needs.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-6xl gap-5 md:grid-cols-3">
          {PUBLIC_PLANS.map((plan) => {
            const Icon = ICONS[plan.iconKey];
            return (
              <div
                key={plan.tier}
                className={`relative rounded-2xl border bg-white p-6 ${
                  plan.highlighted
                    ? "border-terracotta shadow-xl shadow-terracotta/10 ring-2 ring-terracotta"
                    : "border-border-warm shadow-sm"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-6 rounded-full bg-terracotta px-3 py-1 text-xs font-black text-white">
                    Best for automation
                  </span>
                )}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black text-walnut">{plan.name}</h3>
                    <p className="mt-1 text-sm font-semibold text-walnut-2">
                      {plan.audience}
                    </p>
                  </div>
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-terracotta-soft text-terracotta">
                    <Icon size={24} />
                  </span>
                </div>
                <div className="mt-6 flex items-end gap-1">
                  <span className="text-5xl font-black tracking-tight text-walnut">
                    {plan.priceDisplay}
                  </span>
                  <span className="pb-1 text-sm font-bold text-walnut-2">
                    {plan.period}
                  </span>
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.features.slice(0, 5).map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm font-semibold leading-5 text-walnut-2"
                    >
                      <Check size={16} className="mt-0.5 shrink-0 text-acacia" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <details className="mt-4 text-sm text-walnut-2">
                  <summary className="min-h-11 cursor-pointer py-3 font-bold">See all included features</summary>
                  <ul className="space-y-2 pt-2">
                    {plan.features.slice(5).map((feature) => <li key={feature} className="flex gap-2"><Check size={16} className="shrink-0 text-acacia" />{feature}</li>)}
                  </ul>
                </details>
                <Link
                  href={plan.href}
                  className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-black transition ${
                    plan.highlighted
                      ? "bg-terracotta text-white hover:bg-[#234B86]"
                      : "bg-walnut text-white hover:bg-[#1d2a3c]"
                  }`}
                >
                  {plan.cta} <ArrowRight size={16} />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
