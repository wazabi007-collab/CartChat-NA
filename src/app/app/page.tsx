import type { Metadata } from "next";
import Link from "next/link";
import { Smartphone, Share, MoreVertical } from "lucide-react";
import { PublicNavbar } from "@/components/public-navbar";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Install OshiCart as an app",
  description:
    "Add OshiCart or any OshiCart store to your phone's home screen on iPhone and Android. No Play Store or App Store needed.",
  alternates: { canonical: "/app" },
};

const ANDROID_STEPS = [
  "Open the store link in Chrome.",
  "Tap the ⋮ menu in the top-right corner.",
  "Tap Install app, or Add to Home screen.",
  "Tap Install to confirm.",
];

const IOS_STEPS = [
  "Open the store link in Safari. This does not work in Chrome on iPhone.",
  "Tap the Share button at the bottom of the screen.",
  "Scroll down the list and tap Add to Home Screen.",
  "Tap Add in the top-right corner.",
];

export default function AppInstallPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-acacia-soft text-acacia">
            <Smartphone size={22} />
          </span>
          <h1 className="font-black text-3xl tracking-tight text-walnut">
            Use OshiCart like an app
          </h1>
        </div>

        <p className="mt-3 max-w-2xl text-walnut-2">
          You don&apos;t need the Play Store or the App Store. Add OshiCart — or
          any OshiCart shop — straight to your phone&apos;s home screen. It gets
          its own icon and opens full screen, just like an installed app.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Steps
            title="Android"
            hint="Chrome"
            icon={<MoreVertical size={18} />}
            steps={ANDROID_STEPS}
          />
          <Steps
            title="iPhone & iPad"
            hint="Safari only"
            icon={<Share size={18} />}
            steps={IOS_STEPS}
          />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border-warm bg-sand p-5">
            <h2 className="font-black text-walnut">Shoppers: install OshiCart</h2>
            <p className="mt-2 text-sm leading-6 text-walnut-2">
              One app for every shop. It opens on the store directory, so you
              can browse all the stores and order from any of them without
              being stuck in a single shop.
            </p>
            <Link
              href="/stores"
              className="mt-3 inline-block text-sm font-bold text-terracotta hover:underline"
            >
              Browse stores →
            </Link>
          </div>

          <div className="rounded-xl border border-border-warm bg-sand p-5">
            <h2 className="font-black text-walnut">
              Merchants: install your dashboard
            </h2>
            <p className="mt-2 text-sm leading-6 text-walnut-2">
              Follow the same steps while on your dashboard and it installs as
              <strong> OshiCart Dashboard</strong> — a separate app from the
              shopper one, opening straight on your orders.
            </p>
            <Link
              href="/dashboard"
              className="mt-3 inline-block text-sm font-bold text-terracotta hover:underline"
            >
              Open your dashboard →
            </Link>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-border-warm bg-white p-5">
          <h2 className="font-black text-walnut">Good to know</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-walnut-2">
            <li>
              It uses no extra storage worth worrying about — the app is just
              your shop, kept up to date automatically.
            </li>
            <li>
              Prices and stock are always fetched fresh, so what you see is what
              the merchant is actually selling.
            </li>
            <li>
              To remove it, press and hold the icon on your home screen and
              choose Remove or Uninstall.
            </li>
          </ul>
        </div>

        <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold text-terracotta">
          <Link href="/help" className="hover:underline">
            Help &amp; setup guide
          </Link>
          <Link href="/guide" className="hover:underline">
            Merchant setup guide
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function Steps({
  title,
  hint,
  icon,
  steps,
}: {
  title: string;
  hint: string;
  icon: React.ReactNode;
  steps: string[];
}) {
  return (
    <div className="rounded-xl border border-border-warm bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sand text-terracotta">
          {icon}
        </span>
        <h2 className="font-black text-walnut">{title}</h2>
        <span className="rounded-full bg-sand-2 px-2 py-0.5 text-[11px] font-black text-terracotta">
          {hint}
        </span>
      </div>

      <ol className="mt-4 space-y-3">
        {steps.map((step, i) => (
          <li key={step} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-acacia text-xs font-black text-white">
              {i + 1}
            </span>
            <span className="text-sm leading-6 text-walnut-2">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
