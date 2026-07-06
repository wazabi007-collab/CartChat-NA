import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function Hero({
  liveStoreCount = 34,
  liveProductCount = 3000,
}: {
  liveStoreCount?: number;
  liveProductCount?: number;
}) {
  return (
    <section className="bg-white text-walnut border-b border-border-warm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 md:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-walnut-2">
              Made in Namibia · Zero commission · N$ local payments
            </p>

            <h1 className="mt-4 text-[2.15rem] font-black leading-[1.03] tracking-tight sm:text-5xl lg:text-6xl">
              Your Namibian business, online in minutes.
            </h1>

            <p className="mt-4 max-w-xl text-base leading-7 text-walnut-2">
              Turn your WhatsApp side hustle into a professional store link.
              Customers browse, order, and pay you directly — you get automated
              WhatsApp updates from confirmed to completed.
            </p>

            <div className="mt-7 flex items-center gap-5">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-acacia px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-acacia/25 transition hover:bg-[#10833b]"
              >
                Create Free Store <ArrowRight size={17} />
              </Link>
              <Link
                href="/stores"
                className="text-sm font-bold text-terracotta hover:underline"
              >
                Browse stores →
              </Link>
            </div>

            <p className="mt-8 text-sm text-walnut-2">
              <span className="font-black text-walnut">
                {liveStoreCount}+ stores
              </span>{" "}
              ·{" "}
              <span className="font-black text-walnut">
                {liveProductCount.toLocaleString()}+ products
              </span>{" "}
              · automated WhatsApp order updates
            </p>
          </div>

          <div className="relative mx-auto w-[270px] sm:w-[300px]">
            <div className="overflow-hidden rounded-[2.4rem] border-[7px] border-walnut bg-walnut shadow-2xl shadow-walnut/25">
              <Image
                src="/landing/phone-storefront.png"
                alt="A real OshiCart storefront — Octovia Nexus Home & Lifestyle"
                width={390}
                height={800}
                priority
                className="h-auto w-full"
              />
            </div>
            <div className="absolute -left-6 top-14 hidden sm:flex items-center gap-2.5 rounded-2xl border border-border-warm bg-white px-3.5 py-2.5 shadow-xl shadow-walnut/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/whatsapp-icon.webp"
                alt=""
                aria-hidden="true"
                className="h-8 w-8 object-contain"
              />
              <div>
                <p className="text-xs font-black text-walnut">New order #104</p>
                <p className="text-[11px] text-walnut-2">
                  N$337.32 · confirmed
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
