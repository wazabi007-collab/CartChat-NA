import type { Metadata } from "next";
import Link from "next/link";
import { PublicNavbar } from "@/components/public-navbar";
import { Footer } from "@/components/footer";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FAQ } from "@/components/landing/faq";
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  SUPPORT_WHATSAPP,
  supportWhatsAppLink,
} from "@/lib/constants";

export const metadata: Metadata = {
  title: "Help & Setup Guide",
  description: "How to set up and sell on OshiCart — FAQs, selling rules, and support.",
  alternates: { canonical: "/help" },
};

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
        <h1 className="font-black text-3xl tracking-tight text-walnut">Help &amp; setup guide</h1>
        <p className="mt-2 text-walnut-2">Everything you need to set up your store, get paid, and sell on OshiCart.</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <a href="/guide"
             className="rounded-xl border border-border-warm bg-sand p-4 hover:border-acacia transition-colors">
            <p className="font-black text-walnut">Read the setup guide</p>
            <p className="mt-1 text-sm text-walnut-2">Step-by-step guide — read online or download the PDF.</p>
          </a>
          <a href={supportWhatsAppLink()} target="_blank" rel="noopener noreferrer"
             className="rounded-xl border border-border-warm bg-sand p-4 hover:border-acacia transition-colors">
            <p className="font-black text-walnut">Chat to support on WhatsApp</p>
            <p className="mt-1 text-sm text-walnut-2">Call {SUPPORT_PHONE} · WhatsApp {SUPPORT_WHATSAPP} · {SUPPORT_EMAIL}</p>
          </a>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <a href="/app"
             className="rounded-xl border border-border-warm bg-sand p-4 hover:border-acacia transition-colors">
            <p className="font-black text-walnut">Install OshiCart as an app</p>
            <p className="mt-1 text-sm text-walnut-2">Add your store — or your dashboard — to your phone&apos;s home screen on iPhone or Android.</p>
          </a>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-terracotta">
          <Link href="/prohibited-products" className="hover:underline">Selling rules</Link>
          <Link href="/terms" className="hover:underline">Terms of Service</Link>
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
        </div>
      </main>

      <HowItWorks />
      <FAQ />
      <Footer />
    </div>
  );
}
