import Link from "next/link";
import { ArrowRight, Film, Megaphone, Smartphone } from "lucide-react";

const VIDEO_IDEAS = [
  "Stop losing orders in WhatsApp DMs",
  "Open your store in 5 minutes",
  "Customer orders without asking price again",
];

export function CtaBar() {
  return (
    <>
      <section id="video-plan" className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="rounded-2xl bg-walnut p-6 text-white sm:p-8 lg:p-10">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-white/80">
                  <Film size={15} className="text-sun" />
                  Built for video marketing
                </div>
                <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                  Turn every feature into a Facebook, Instagram, and TikTok ad.
                </h2>
                <p className="mt-4 text-base leading-7 text-white/75">
                  The redesigned site should support short demos: setup, store
                  sharing, checkout, payment proof, dashboard orders, and local
                  payment methods.
                </p>
              </div>
              <div className="grid gap-3">
                {VIDEO_IDEAS.map((idea, index) => (
                  <div
                    key={idea}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/8 p-4"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-acacia text-sm font-black text-white">
                      {index + 1}
                    </span>
                    <span className="font-bold text-white">{idea}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-sand py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <div className="mb-4 flex justify-center gap-3 text-terracotta">
            <Megaphone size={24} />
            <Smartphone size={24} />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-walnut sm:text-4xl">
            Open your shop today. Free to start.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-walnut-2">
            Build the store link once. Use it everywhere your customers already
            are: WhatsApp Status, Facebook groups, Instagram bio, TikTok, flyers,
            and QR codes.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-acacia px-6 py-3 text-sm font-black text-white transition hover:bg-[#10833b]"
          >
            Create Free Store <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </>
  );
}
