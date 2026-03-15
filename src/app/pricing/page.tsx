import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { PublicNavbar } from "@/components/public-navbar";

export const metadata: Metadata = {
  title: "Pricing",
  description: "OshiCart pricing plans — start free for 30 days. Simple, transparent pricing with zero transaction fees. Keep 100% of your profits.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />
      <main className="py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 text-center mb-3">
            Simple pricing
          </h1>
          <p className="text-gray-500 text-center mb-12 max-w-xl mx-auto">
            Start free for 30 days. Upgrade when you&apos;re ready to grow.
            Zero transaction fees on all plans — you keep 100% of your profits.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-4 items-start pt-4">
            <PricingCard
              name="Oshi-Start"
              price="N$0"
              period="30-day trial"
              features={[
                "10 products",
                "20 orders/month",
                "Product catalog",
                "Order management",
                "EFT proof upload",
                "OshiCart branding",
              ]}
              cta="Start Free Trial"
              href="/signup"
              highlighted={false}
            />
            <PricingCard
              name="Oshi-Basic"
              price="N$99"
              period="/month"
              features={[
                "30 products",
                "200 orders/month",
                "No OshiCart branding",
                "Sales analytics",
                "Everything in Start",
              ]}
              cta="Get Started"
              href="/signup?tier=oshi_basic"
              highlighted={true}
              badge="Most Popular"
            />
            <PricingCard
              name="Oshi-Grow"
              price="N$299"
              period="/month"
              features={[
                "200 products",
                "500 orders/month",
                "Inventory tracking",
                "Coupon codes",
                "Everything in Basic",
              ]}
              cta="Get Started"
              href="/signup?tier=oshi_grow"
              highlighted={false}
            />
            <PricingCard
              name="Oshi-Pro"
              price="N$499"
              period="/month"
              features={[
                "Unlimited products",
                "Unlimited orders",
                "Import via API, Excel & CSV",
                "Priority support",
                "All features",
                "Everything in Grow",
              ]}
              cta="Get Started"
              href="/signup?tier=oshi_pro"
              highlighted={false}
            />
          </div>

          {/* FAQ */}
          <div className="mt-20 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              <FAQ
                q="Are there any transaction fees?"
                a="No. Zero transaction fees on all plans. What you earn is what you keep. You only pay the monthly subscription."
              />
              <FAQ
                q="Can I change plans later?"
                a="Yes. You can upgrade or downgrade your plan at any time from your dashboard."
              />
              <FAQ
                q="What payment methods can my customers use?"
                a="EFT (bank transfer), MTC MoMo, FNB Pay2Cell, eWallet (FNB, PayPulse, EasyWallet, PayToday), and Cash on Delivery."
              />
              <FAQ
                q="Do I need technical skills?"
                a="No. If you can use WhatsApp, you can use OshiCart. Setup takes under 5 minutes."
              />
              <FAQ
                q="What happens after my free trial?"
                a="After 30 days, choose a paid plan to continue. Your store and products are saved — nothing is lost."
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function PricingCard({
  name, price, period, features, cta, href, highlighted, badge,
}: {
  name: string; price: string; period: string; features: string[];
  cta: string; href: string; highlighted: boolean; badge?: string;
}) {
  return (
    <div className={`rounded-2xl border flex flex-col transition-all hover:shadow-lg ${
      highlighted
        ? "border-[#2B5EA7] ring-2 ring-[#2B5EA7] bg-white relative scale-[1.02]"
        : "bg-white hover:border-gray-300"
    }`}>
      {badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#2B5EA7] text-white text-[11px] font-bold px-4 py-1 rounded-full shadow-sm whitespace-nowrap z-10">
          {badge}
        </span>
      )}
      <div className={`px-6 pt-7 pb-5 ${highlighted ? "bg-blue-50/50" : ""}`}>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{name}</h3>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-4xl font-extrabold text-gray-900 tracking-tight">{price}</span>
          <span className="text-gray-400 text-sm font-medium">{period}</span>
        </div>
      </div>
      <div className="px-6 pb-6 flex-1 flex flex-col">
        <ul className="space-y-3 flex-1">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600 leading-snug">
              <Check size={16} className="text-[#4A9B3E] flex-shrink-0 mt-0.5" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <Link href={href} className={`block text-center mt-6 py-3 rounded-xl text-sm font-semibold transition-all ${
          highlighted
            ? "bg-[#2B5EA7] text-white hover:bg-[#234B86] shadow-md shadow-[#2B5EA7]/20"
            : "bg-gray-900 text-white hover:bg-gray-800"
        }`}>
          {cta}
        </Link>
      </div>
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h3 className="font-medium text-gray-900">{q}</h3>
      <p className="text-sm text-gray-500 mt-1">{a}</p>
    </div>
  );
}
