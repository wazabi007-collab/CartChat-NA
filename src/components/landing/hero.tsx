import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  MessageCircle,
  Play,
  ShieldCheck,
  Store,
} from "lucide-react";

const SELLER_TYPES = [
  "Shops",
  "Local vendors",
  "Food sellers",
  "Fashion",
  "Beauty",
  "Electronics",
  "Services",
  "Home businesses",
];

export function Hero({
  liveStoreCount = 34,
  liveProductCount = 3000,
}: {
  liveStoreCount?: number;
  liveProductCount?: number;
}) {
  return (
    <section className="relative overflow-hidden bg-white text-walnut">
      <div className="absolute inset-0 hidden md:block">
        <Image
          src="/hero-industries.webp"
          alt="OshiCart serving shops, clothing stores, restaurants, market sellers, beauty businesses, and delivery orders"
          fill
          priority
          sizes="(min-width: 768px) 100vw, 1px"
          className="hidden object-cover md:block"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.88)_34%,rgba(255,255,255,0.36)_58%,rgba(255,255,255,0.04)_100%)]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-6 md:pt-14 md:pb-10 lg:pt-20 lg:pb-14">
        <div className="max-w-3xl">
          <div className="mb-5 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1 text-xs font-bold text-walnut ring-1 ring-walnut/10 shadow-sm">
              <BadgeCheck size={14} className="text-acacia" />
              Made for Namibia
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1 text-xs font-bold text-walnut ring-1 ring-walnut/10 shadow-sm">
              <ShieldCheck size={14} className="text-sun" />
              Zero commission
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1 text-xs font-bold text-walnut ring-1 ring-walnut/10 shadow-sm">
              <MessageCircle size={14} className="text-acacia" />
              Automated WhatsApp updates
            </span>
          </div>

          <h1 className="text-[2.15rem] font-black leading-[1.03] tracking-tight sm:text-5xl lg:text-7xl">
            Your Namibian business, online in minutes.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-walnut-2 sm:hidden">
            Launch a clean store link, take orders, get paid locally, and keep
            customers updated on WhatsApp.
          </p>
          <p className="mt-5 hidden max-w-2xl text-base leading-7 text-walnut-2 sm:block sm:text-xl">
            Shops, vendors, food sellers, salons, service providers, and
            WhatsApp side hustles can launch a clean online store, take orders,
            get paid locally, and send automated WhatsApp updates as orders
            move from confirmed to ready and completed.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-acacia px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-acacia/25 transition hover:bg-[#10833b]"
            >
              Create Free Store <ArrowRight size={17} />
            </Link>
            <a
              href="#video-plan"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-extrabold text-walnut shadow-sm ring-1 ring-walnut/10 transition hover:bg-sand"
            >
              <Play size={17} /> Watch Demo
            </a>
            <Link
              href="/stores"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-walnut/10 bg-white/75 px-5 py-3 text-sm font-extrabold text-walnut backdrop-blur transition hover:bg-white"
            >
              <Store size={17} /> Browse Stores
            </Link>
          </div>

          <div className="mt-6 md:hidden">
            <div className="relative overflow-hidden rounded-2xl border border-walnut/10 bg-sand shadow-sm">
              <Image
                src="/hero-industries.webp"
                alt="OshiCart storefront flow showing products, checkout, delivery, and WhatsApp ordering"
                width={1600}
                height={900}
                sizes="(max-width: 768px) 100vw"
                className="aspect-[4/3] w-full object-cover object-[68%_center]"
              />
              <div className="absolute inset-x-3 top-3 rounded-xl bg-white/94 p-3 shadow-lg shadow-slate-900/10 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-acacia">
                  Store link to WhatsApp update
                </p>
                <div className="mt-2 flex flex-col items-start gap-2">
                  <p className="text-sm font-black leading-5 text-walnut">
                    Browse, order, pay, and track
                  </p>
                  <span className="shrink-0 rounded-lg bg-acacia px-2.5 py-1.5 text-xs font-black text-white">
                    N$337.32
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold text-walnut-2">
            {SELLER_TYPES.map((type) => (
              <span
                key={type}
                className="rounded-full border border-walnut/10 bg-white/75 px-3 py-1 shadow-sm"
              >
                {type}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 sm:mt-10 sm:gap-3 lg:max-w-3xl">
          <HeroMetric value={`${liveStoreCount}+`} label="stores onboarded" />
          <HeroMetric
            value={`${liveProductCount.toLocaleString()}+`}
            label="products listed"
          />
          <HeroMetric value="Auto" label="WhatsApp order updates" />
        </div>
      </div>

      <div className="relative border-t border-white/10 bg-white/95 text-walnut">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 text-sm font-bold sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>No commission. Local payments. WhatsApp orders.</span>
          <span className="inline-flex items-center gap-2 text-acacia">
            <MessageCircle size={17} />
            Automated confirmations, ready alerts, and completion messages
          </span>
        </div>
      </div>
    </section>
  );
}

function HeroMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-walnut/10 bg-white/80 p-3 shadow-sm backdrop-blur sm:p-4">
      <div className="text-xl font-black text-walnut sm:text-2xl">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-walnut-2 sm:text-xs">
        {label}
      </div>
    </div>
  );
}
