import Image from "next/image";
import type { ReactNode } from "react";
import {
  Banknote,
  CheckCircle2,
  Link2,
  MessageCircle,
  PackageCheck,
  PackagePlus,
  Share2,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";

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
    body: "Accept EFT, PayToday, Pay2Cell, eWallet, MTC Maris, or cash on delivery with zero OshiCart commission.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-3xl">
          <h2 className="mt-3 text-3xl font-black tracking-tight text-walnut sm:text-4xl">
            How an OshiCart order moves from store link to WhatsApp update.
          </h2>
          <p className="mt-3 text-base leading-7 text-walnut-2">
            A customer can browse a real store, choose products, select pickup
            or delivery, and get automatic WhatsApp updates while the merchant
            manages the order.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-2xl border border-border-warm bg-sand shadow-sm">
              <Image
                src="/landing/featured-octovia-nexus.webp"
                alt="Octovia Nexus Home and Lifestyle products displayed with an online store preview"
                width={1200}
                height={700}
                className="aspect-[16/10] w-full object-cover"
              />
              <div className="absolute inset-x-4 bottom-4 rounded-xl bg-white/94 p-4 shadow-lg shadow-slate-900/10 backdrop-blur">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-terracotta">
                      Octovia Nexus Home & Lifestyle
                    </p>
                    <p className="mt-1 text-lg font-black text-walnut">
                      Customer adds a product from the store link
                    </p>
                  </div>
                  <div className="rounded-lg bg-acacia px-3 py-2 text-right text-white">
                    <p className="text-[10px] font-black uppercase tracking-wide">Total</p>
                    <p className="text-sm font-black">N$337.32</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <MiniStat label="Product" value="Coffee set" />
              <MiniStat label="Delivery" value="Yango buyer-paid" />
              <MiniStat label="VAT" value="Shown on invoice" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border-warm bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-acacia" />
                <h3 className="text-lg font-black text-walnut">Real order flow</h3>
              </div>
              <div className="mt-5 space-y-4">
                <FlowRow
                  icon={Link2}
                  title="Customer opens your store link"
                  body="They browse products with prices, stock, variants, and store payment options."
                />
                <FlowRow
                  icon={Banknote}
                  title="Checkout calculates the order"
                  body="Subtotal, VAT, delivery choice, buyer-paid courier, and invoice total are shown before order submission."
                />
                <FlowRow
                  icon={PackageCheck}
                  title="Merchant updates the order"
                  body="Move the order from pending to confirmed, ready, and completed from the dashboard."
                />
                <FlowRow
                  icon={MessageCircle}
                  title="WhatsApp updates go out automatically"
                  body="The customer receives status messages without the merchant typing the same replies again."
                />
              </div>
            </div>

            <div className="rounded-2xl border border-[#d4f3dc] bg-[#f4fff7] p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-acacia">
                    WhatsApp preview
                  </p>
                  <h3 className="mt-1 text-lg font-black text-walnut">
                    Automated responses customers understand
                  </h3>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-acacia shadow-sm">
                  Auto
                </span>
              </div>

              <div className="mt-5 space-y-3">
                <ChatBubble>
                  Order #104 received from Octovia Nexus Home & Lifestyle.
                  Total: N$337.32. Track your order from the link below.
                </ChatBubble>
                <ChatBubble>
                  Your order has been confirmed. We will update you when it is
                  ready for pickup or courier collection.
                </ChatBubble>
                <ChatBubble>
                  Order #104 is ready. Please use your selected delivery or
                  collection option.
                </ChatBubble>
              </div>
            </div>
          </div>
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-warm bg-white p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-walnut-2/60">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-walnut">{value}</p>
    </div>
  );
}

function FlowRow({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sand text-terracotta">
        <Icon size={18} />
      </span>
      <div>
        <p className="font-black text-walnut">{title}</p>
        <p className="mt-1 text-sm leading-6 text-walnut-2">{body}</p>
      </div>
    </div>
  );
}

function ChatBubble({ children }: { children: ReactNode }) {
  return (
    <div className="ml-auto max-w-[92%] rounded-2xl rounded-tr-sm bg-white px-4 py-3 text-sm font-semibold leading-6 text-walnut shadow-sm ring-1 ring-acacia/10">
      <div className="flex gap-2">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-acacia" />
        <span>{children}</span>
      </div>
    </div>
  );
}
