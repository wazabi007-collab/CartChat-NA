import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BotMessageSquare, Check, Rocket, Store } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PublicNavbar } from "@/components/public-navbar";
import { PUBLIC_PLANS, type PlanIconKey } from "@/lib/plans";

const ICONS: Record<PlanIconKey, LucideIcon> = {
  store: Store,
  automate: BotMessageSquare,
  pro: Rocket,
};

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "OshiCart pricing for Namibian sellers: a storefront plan and an automated WhatsApp plan for customer order updates.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-sand">
      <PublicNavbar />
      <main className="px-4 py-14 sm:px-6 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-acacia-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-acacia">
              <BotMessageSquare size={15} />
              WhatsApp automation available
            </span>
            <h1 className="text-4xl font-black tracking-tight text-walnut sm:text-5xl">
              Plans that scale with your store.
            </h1>
            <p className="mt-4 text-base leading-7 text-walnut-2">
              Use Storefront when you need a professional order link, Automate when you want customer WhatsApps sent automatically, and Pro when your store has outgrown order limits.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-6xl gap-5 md:grid-cols-3">
            {PUBLIC_PLANS.map((plan) => (
              <PricingCard
                key={plan.tier}
                name={plan.name}
                price={plan.priceDisplay}
                period={plan.period}
                audience={plan.audience}
                features={plan.features}
                cta={plan.cta}
                href={plan.href}
                icon={ICONS[plan.iconKey]}
                highlighted={plan.highlighted}
              />
            ))}
          </div>

          <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-border-warm bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-walnut">
              Frequently asked questions
            </h2>
            <div className="mt-6 divide-y divide-border-warm">
              <FAQ
                q="Is WhatsApp automated?"
                a="Yes on Oshi-Automate. Customers can receive order confirmed, ready, and completed WhatsApp messages automatically."
              />
              <FAQ
                q="Can I start with Storefront and upgrade later?"
                a="Yes. You can start with Storefront and move to Automate when you want automated customer updates, inventory tracking, and coupon tools."
              />
              <FAQ
                q="Is there a free trial?"
                a="Yes. New sellers can start with a free trial before choosing the plan that fits their store."
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function PricingCard({
  name,
  price,
  period,
  audience,
  features,
  cta,
  href,
  icon: Icon,
  highlighted = false,
}: {
  name: string;
  price: string;
  period: string;
  audience: string;
  features: string[];
  cta: string;
  href: string;
  icon: LucideIcon;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
        highlighted ? "border-terracotta ring-2 ring-terracotta" : "border-border-warm"
      }`}
    >
      {highlighted && (
        <span className="absolute -top-3 left-6 rounded-full bg-terracotta px-3 py-1 text-xs font-black text-white">
          Best for automation
        </span>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-walnut">{name}</h3>
          <p className="mt-1 text-sm font-semibold leading-5 text-walnut-2">
            {audience}
          </p>
        </div>
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-terracotta-soft text-terracotta">
          <Icon size={24} />
        </span>
      </div>
      <div className="mt-6 flex items-end gap-1">
        <span className="text-5xl font-black tracking-tight text-walnut">
          {price}
        </span>
        <span className="pb-1 text-sm font-bold text-walnut-2">{period}</span>
      </div>
      <ul className="mt-6 flex-1 space-y-3">
        {features.map((feature) => (
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
        href={href}
        className={`mt-7 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-black transition ${
          highlighted
            ? "bg-terracotta text-white hover:bg-[#234B86]"
            : "bg-walnut text-white hover:bg-[#1d2a3c]"
        }`}
      >
        {cta} <ArrowRight size={16} />
      </Link>
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <div className="py-5">
      <h3 className="font-black text-walnut">{q}</h3>
      <p className="mt-1 text-sm leading-6 text-walnut-2">{a}</p>
    </div>
  );
}
