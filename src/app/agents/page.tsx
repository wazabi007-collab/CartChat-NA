import type { Metadata } from "next";
import Link from "next/link";
import { Handshake, Wallet, QrCode, Store, ShieldCheck, BookOpen } from "lucide-react";
import { PublicNavbar } from "@/components/public-navbar";
import { REFERRED_TRIAL_DAYS, STANDARD_TRIAL_DAYS } from "@/lib/constants";
import { AgentApplyForm } from "./apply-form";

export const metadata: Metadata = {
  title: "Become a Referral Agent",
  description:
    "Earn N$75 to N$400 for every Namibian business you bring to OshiCart. Free to join, paid by EFT, no cap on earnings.",
  alternates: { canonical: "/agents" },
};

const BOUNTIES = [
  { plan: "Oshi-Storefront", price: "N$149/month", earn: "N$75" },
  { plan: "Oshi-Automate", price: "N$399/month", earn: "N$200" },
  { plan: "Oshi-Pro", price: "N$799/month", earn: "N$400" },
];

/**
 * Public signup for referral agents.
 *
 * Agents used to be created by hand in the admin console; this page lets
 * anyone apply. Applications land as pending and the code only starts
 * crediting signups once approved — the rules acceptance is what makes the
 * rules enforceable.
 */
export default function AgentsPage() {
  return (
    <div className="min-h-screen bg-sand">
      <PublicNavbar />

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-acacia-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-acacia">
            <Handshake size={15} />
            Referral agents
          </span>
          <h1 className="text-4xl font-black tracking-tight text-walnut sm:text-5xl">
            Know businesses that sell on WhatsApp?
            <span className="block text-acacia">Get paid to bring them online.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-walnut-2">
            Every shop, salon, baker or mechanic you sign up gets their own
            online store. When they start paying for a plan, you get paid —
            by EFT, every time, with no cap.
          </p>
        </div>

        {/* What you earn */}
        <div className="mt-10 overflow-hidden rounded-2xl border border-border-warm bg-white shadow-sm">
          <div className="border-b border-border-warm bg-sand-2 px-5 py-3 text-xs font-black uppercase tracking-wide text-walnut-2">
            What you earn — once per store, no cap
          </div>
          <table className="w-full text-sm">
            <tbody>
              {BOUNTIES.map((b) => (
                <tr key={b.plan} className="border-b border-border-warm last:border-0">
                  <td className="px-5 py-3 font-bold text-walnut">{b.plan}</td>
                  <td className="px-5 py-3 text-walnut-2">{b.price}</td>
                  <td className="px-5 py-3 text-right text-lg font-black text-acacia">{b.earn}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Agents quote this number to shop owners, so it has to be the same
              figure the setup wizard actually writes to trial_ends_at. */}
          <p className="px-5 pb-4 pt-2 text-xs leading-5 text-walnut-2">
            Merchants you refer also get a {REFERRED_TRIAL_DAYS}-day free trial
            instead of {STANDARD_TRIAL_DAYS} —{" "}
            {REFERRED_TRIAL_DAYS - STANDARD_TRIAL_DAYS} extra days, because they
            came from you. You earn when they pay for their first month.
          </p>
        </div>

        {/* How it works */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: QrCode,
              title: "1. Get your link",
              text: "We approve your application and you get a personal link like oshicart.com/r/yourname.",
            },
            {
              icon: Store,
              title: "2. Sign stores up",
              text: "Share your link with any business selling on WhatsApp. They sign up through it — that's the whole job.",
            },
            {
              icon: Wallet,
              title: "3. Get paid by EFT",
              text: "When a store you referred pays for a plan, your bounty is recorded and paid out by EFT.",
            },
          ].map((s) => (
            <div key={s.title} className="rounded-2xl border border-border-warm bg-white p-5 shadow-sm">
              <s.icon size={20} className="text-acacia" />
              <h3 className="mt-2 text-sm font-black text-walnut">{s.title}</h3>
              <p className="mt-1 text-xs leading-5 text-walnut-2">{s.text}</p>
            </div>
          ))}
        </div>

        {/* Practice store */}
        <div className="mt-8 rounded-2xl border border-border-warm bg-white p-5 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-black text-walnut">
            <Store size={16} className="text-acacia" />
            Practice before you pitch
          </h3>
          <p className="mt-1 text-sm leading-6 text-walnut-2">
            The demo store is a real OshiCart storefront that isn&apos;t a real
            business. Browse it, add things to the cart, go through checkout,
            even book the demo appointment — click everything until you can
            show a shop owner how it works without hesitating.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/s/oshicart-demo"
              className="inline-flex min-h-11 items-center rounded-xl bg-acacia px-5 text-sm font-black text-white transition-colors hover:bg-green-700"
            >
              Open the demo store
            </Link>
            {/* The handbook was only linked from the application confirmation
                and the rules page, so an already-approved agent had nowhere to
                find it again. It is the thing they reread most. */}
            <a
              href="/oshicart-referral-agent-handbook.pdf"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-warm bg-white px-5 text-sm font-black text-walnut transition-colors hover:bg-sand-2"
            >
              <BookOpen size={16} className="text-acacia" />
              Agent handbook (PDF)
            </a>
          </div>
          <p className="mt-2 text-xs text-walnut-2">
            Already an agent? The handbook is always here at{" "}
            <span className="font-bold">oshicart.com/agents</span> — it covers
            every feature and how to explain it.
          </p>
        </div>

        {/* The rules, honestly */}
        <div className="mt-8 rounded-2xl border border-border-warm bg-white p-5 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-black text-walnut">
            <ShieldCheck size={16} className="text-acacia" />
            The rules, in short
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm leading-6 text-walnut-2">
            <li>• Be honest: OshiCart takes no commission on sales, but plans cost money after the free trial. Never promise anything the plans don&apos;t include.</li>
            <li>• Real businesses only — signing up fake or duplicate stores forfeits those bounties.</li>
            <li>• You can&apos;t refer yourself or your own store.</li>
            <li>• No spam: no bulk messages to strangers, no posting your link in groups that forbid it.</li>
            <li>• Bounties are paid after the merchant&apos;s first paid month, by EFT.</li>
          </ul>
          <p className="mt-2 text-xs text-walnut-2">
            The full version you&apos;ll accept below:{" "}
            <Link href="/agents/terms" className="font-bold text-terracotta underline">
              Agent Rules &amp; Regulations
            </Link>
          </p>
        </div>

        {/* Application */}
        <div className="mt-8 rounded-2xl border border-border-warm bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-black text-walnut">Apply to become an agent</h2>
          <p className="mt-1 text-sm text-walnut-2">
            We review every application and reply on WhatsApp — usually within a day.
          </p>
          <AgentApplyForm />
        </div>
      </main>
    </div>
  );
}
