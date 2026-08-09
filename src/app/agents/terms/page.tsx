import type { Metadata } from "next";
import Link from "next/link";
import { PublicNavbar } from "@/components/public-navbar";

export const metadata: Metadata = {
  title: "Agent Rules & Regulations",
  description: "The rules OshiCart referral agents accept when they apply.",
  alternates: { canonical: "/agents/terms" },
};

/**
 * The rules an agent accepts at application time (referrers.accepted_terms_at
 * records the acceptance). Written to be read on a phone by a non-lawyer:
 * short numbered rules, each with the reason it exists.
 */
export default function AgentTermsPage() {
  return (
    <div className="min-h-screen bg-sand">
      <PublicNavbar />

      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-black tracking-tight text-walnut">
          Agent Rules &amp; Regulations
        </h1>
        <p className="mt-2 text-sm text-walnut-2">
          Accepting these is part of applying at{" "}
          <Link href="/agents" className="font-bold text-terracotta underline">
            oshicart.com/agents
          </Link>
          . They exist to keep the programme fair — for merchants, for other
          agents, and for you.
        </p>

        <ol className="mt-8 space-y-6 text-sm leading-7 text-walnut">
          <li>
            <h2 className="font-black">1. What you earn, exactly</h2>
            <p className="text-walnut-2">
              You earn a one-time bounty when a merchant who signed up through
              your link (or entered your code at setup) pays for their first
              month: N$75 for Oshi-Storefront, N$200 for Oshi-Automate, N$400
              for Oshi-Pro. Free-plan stores earn nothing until they upgrade.
              There is no cap on how many merchants you refer.
            </p>
          </li>
          <li>
            <h2 className="font-black">2. How and when you are paid</h2>
            <p className="text-walnut-2">
              Payouts are made by EFT to the bank account you gave us, after
              the merchant&apos;s first paid month is confirmed. If the
              merchant&apos;s payment is refunded or reversed, the bounty for
              that merchant falls away.
            </p>
          </li>
          <li>
            <h2 className="font-black">3. Be honest about what OshiCart is</h2>
            <p className="text-walnut-2">
              OshiCart takes no commission on a merchant&apos;s sales — that
              claim is true and you should use it. But plans cost money after
              the free trial, and you must say so. Never promise features,
              prices or terms that don&apos;t exist. A merchant who feels
              misled cancels, and helps nobody.
            </p>
          </li>
          <li>
            <h2 className="font-black">4. Real businesses only</h2>
            <p className="text-walnut-2">
              Signing up fake stores, duplicate stores, or businesses that
              didn&apos;t agree to be signed up forfeits those bounties and
              may end your agent account. You also can&apos;t refer yourself
              or a business you own.
            </p>
          </li>
          <li>
            <h2 className="font-black">5. No spam</h2>
            <p className="text-walnut-2">
              No bulk messages to people who don&apos;t know you, no posting
              your link in groups that forbid advertising, no pretending to
              be OshiCart staff. You are an independent agent, not an
              employee, and you may not sign anything on OshiCart&apos;s
              behalf.
            </p>
          </li>
          <li>
            <h2 className="font-black">6. Your code and link</h2>
            <p className="text-walnut-2">
              Your code is personal and can&apos;t be transferred or sold. A
              merchant is credited to you when they sign up through your link
              or enter your code during setup — afterwards it cannot be
              changed, so make sure they use it.
            </p>
          </li>
          <li>
            <h2 className="font-black">7. Fraud checks and changes</h2>
            <p className="text-walnut-2">
              OshiCart may withhold or reclaim bounties where fraud is
              suspected, and may change bounty amounts or these rules for
              future signups with notice. Changes never reduce a bounty you
              have already earned.
            </p>
          </li>
        </ol>

        <div className="mt-10 rounded-2xl border border-border-warm bg-white p-5 text-sm text-walnut-2 shadow-sm">
          Questions? Message the OshiCart team on WhatsApp — the number you
          were welcomed from — or see the{" "}
          <a
            href="/oshicart-referral-agent-handbook.pdf"
            className="font-bold text-terracotta underline"
          >
            Agent Handbook
          </a>
          .
        </div>
      </main>
    </div>
  );
}
