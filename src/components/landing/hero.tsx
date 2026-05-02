import Link from "next/link";
import { WhatsAppPhoneMock } from "./whatsapp-phone-mock";

export function Hero({
  liveStoreCount = 34,
  liveProductCount = 3000,
}: {
  liveStoreCount?: number;
  liveProductCount?: number;
}) {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, var(--sand) 0%, var(--sand-2) 100%)",
      }}
    >
      <div className="mx-auto max-w-6xl px-6 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12 items-center">
        <div>
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="text-[10px] tracking-[0.12em] font-bold px-2.5 py-1 rounded-full bg-terracotta-soft text-terracotta">
              ★ MADE IN NAMIBIA
            </span>
            <span className="text-[10px] tracking-[0.12em] font-bold px-2.5 py-1 rounded-full bg-white border border-border-warm text-walnut-2">
              FREE TO START
            </span>
          </div>
          <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight text-walnut leading-[1.05]">
            Sell on WhatsApp.
            <br />
            Built for <span className="text-acacia">Namibia.</span>
          </h1>
          <p className="mt-5 text-base lg:text-lg text-walnut-2 max-w-xl leading-relaxed">
            Open your digital store, take orders on WhatsApp, and accept
            PayToday, EFT, eWallet & Cash on Delivery. No commission. No setup
            fees.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-terracotta text-white font-semibold text-sm hover:opacity-90 transition"
            >
              Open my free store →
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-walnut text-walnut font-semibold text-sm hover:bg-walnut hover:text-sand transition"
            >
              ▶ Watch demo
            </a>
          </div>
          <p className="mt-5 text-sm text-walnut-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-acacia" />
            {liveStoreCount} Namibian stores live ·{" "}
            {liveProductCount.toLocaleString()}+ products listed
          </p>
        </div>
        <div className="lg:justify-self-end">
          <WhatsAppPhoneMock
            lines={[
              { kind: "in", text: "Hi! I'd like to order 👇" },
              { kind: "product", name: "Brazilian Hair", price: "N$450" },
              { kind: "product", name: "Lash Kit", price: "N$120" },
              { kind: "out", text: "Total: N$570 · PayToday" },
              { kind: "success", text: "✓ Payment confirmed" },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
