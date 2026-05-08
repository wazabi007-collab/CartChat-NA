import { Banknote, Link2, PackagePlus, Share2 } from "lucide-react";

const STEPS = [
  {
    icon: PackagePlus,
    title: "Create your store",
    body: "Add your logo, products, prices, payment options, and delivery rules from your phone.",
  },
  {
    icon: Share2,
    title: "Share one link",
    body: "Post your OshiCart link on WhatsApp Status, Facebook, Instagram, TikTok, or a printed QR code.",
  },
  {
    icon: Link2,
    title: "Customers order themselves",
    body: "They browse, add to cart, choose delivery or pickup, and submit a clean order.",
  },
  {
    icon: Banknote,
    title: "Get paid locally",
    body: "Accept EFT, PayToday, Pay2Cell, eWallet, MoMo, or cash on delivery with zero OshiCart commission.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-terracotta">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-walnut sm:text-4xl">
            From WhatsApp hustle to real online shop.
          </h2>
          <p className="mt-3 text-base leading-7 text-walnut-2">
            OshiCart keeps the workflow simple for sellers who already know
            WhatsApp, but need cleaner ordering, payments, and stock control.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="rounded-xl border border-border-warm bg-sand p-5"
              >
                <div className="mb-5 flex items-center justify-between">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white text-terracotta shadow-sm">
                    <Icon size={22} />
                  </span>
                  <span className="text-sm font-black text-walnut-2/40">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="text-lg font-black text-walnut">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-walnut-2">
                  {step.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
