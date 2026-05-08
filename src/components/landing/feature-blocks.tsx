import {
  BarChart3,
  BotMessageSquare,
  Boxes,
  FileText,
  MessageSquareText,
  Percent,
} from "lucide-react";

const FEATURES = [
  {
    icon: MessageSquareText,
    title: "Clean WhatsApp orders",
    body: "Customers send complete orders with items, quantities, delivery choice, and payment proof.",
  },
  {
    icon: BotMessageSquare,
    title: "Automated WhatsApp replies",
    body: "Customers receive order confirmed, ready, and completed updates when merchants move an order forward.",
  },
  {
    icon: Boxes,
    title: "Stock control",
    body: "Track quantities, show out-of-stock badges, and reduce the 'is this available?' messages.",
  },
  {
    icon: Percent,
    title: "Coupons and promos",
    body: "Run launch discounts, weekend specials, and customer offers without manual calculations.",
  },
  {
    icon: FileText,
    title: "Invoices and VAT",
    body: "Create professional invoices with Namibia's 15% VAT support when your business needs it.",
  },
  {
    icon: BarChart3,
    title: "Sales visibility",
    body: "See orders, revenue, products, and low-stock warnings from one mobile-friendly dashboard.",
  },
];

export function FeatureBlocks() {
  return (
    <section className="bg-white py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-terracotta">
              Platform features
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-walnut sm:text-4xl">
              Built to replace messy DMs, notebooks, and manual totals.
            </h2>
            <p className="mt-4 text-base leading-7 text-walnut-2">
              OshiCart is built around Namibia&apos;s real seller workflow: local
              payments, mobile-first pages, simple order handling, automated
              WhatsApp updates, and practical trust.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-xl border border-border-warm bg-sand p-5"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white text-terracotta shadow-sm">
                    <Icon size={21} />
                  </span>
                  <h3 className="mt-4 text-lg font-black text-walnut">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-walnut-2">
                    {feature.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
