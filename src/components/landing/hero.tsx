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
    <section className="relative overflow-hidden bg-walnut text-white">
      <div className="absolute inset-0">
        <Image
          src="/hero-main.webp"
          alt="Namibian merchant using OshiCart"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,18,32,0.94)_0%,rgba(11,18,32,0.74)_42%,rgba(11,18,32,0.22)_100%)]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-14 pb-10 lg:pt-20 lg:pb-14">
        <div className="max-w-3xl">
          <div className="mb-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/20">
              <BadgeCheck size={14} className="text-acacia" />
              Made for Namibia
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/20">
              <ShieldCheck size={14} className="text-sun" />
              Zero commission
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/20">
              <MessageCircle size={14} className="text-acacia" />
              Automated WhatsApp updates
            </span>
          </div>

          <h1 className="text-4xl font-black leading-[1.02] tracking-tight sm:text-5xl lg:text-7xl">
            Your Namibian business, online in minutes.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/86 sm:text-xl">
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
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-extrabold text-walnut transition hover:bg-sand"
            >
              <Play size={17} /> Watch Demo
            </a>
            <Link
              href="/stores"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/10 px-5 py-3 text-sm font-extrabold text-white backdrop-blur transition hover:bg-white/15"
            >
              <Store size={17} /> Browse Stores
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold text-white/85">
            {SELLER_TYPES.map((type) => (
              <span
                key={type}
                className="rounded-full border border-white/15 bg-white/10 px-3 py-1"
              >
                {type}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-3 lg:max-w-3xl">
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
    <div className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur">
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="text-xs font-bold uppercase tracking-wide text-white/65">
        {label}
      </div>
    </div>
  );
}
