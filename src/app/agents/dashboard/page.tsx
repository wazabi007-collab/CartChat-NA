import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  LogIn,
  ShieldAlert,
  Store,
  Wallet,
} from "lucide-react";
import { PublicNavbar } from "@/components/public-navbar";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL, supportWhatsAppLink } from "@/lib/constants";
import { formatNamibianDate } from "@/lib/date";
import { TIER_LABELS, type SubscriptionTier } from "@/lib/tier-limits";
import {
  buildReferralLedger,
  formatBounty,
  MILESTONE_LABELS,
  type ReferralPayout,
  type ReferredMerchant,
} from "@/lib/referrals";
import { ShareLinkCard } from "./share-link";
import { PracticeStoreCard } from "./practice-store";

export const metadata: Metadata = {
  title: "Agent Dashboard",
  // Private, per-agent data behind a sign-in — nothing here belongs in search.
  robots: { index: false, follow: false },
};

const shell = "min-h-screen bg-sand";
const cardWarm = "rounded-2xl border border-border-warm bg-white p-5 shadow-sm";

/** Handbook + practice store, repeated in every state because every state wants them. */
function AgentResources() {
  return (
    <div className="mt-8 flex flex-wrap gap-2">
      {/* Plain <a>: the handbook is a static asset in /public, and <Link>
          RSC-prefetches it as if it were a route, logging a 404. */}
      <a
        href="/oshicart-referral-agent-handbook.pdf"
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-warm bg-white px-5 text-sm font-black text-walnut transition-colors hover:bg-sand-2"
      >
        <BookOpen size={16} className="text-acacia" />
        Agent handbook (PDF)
      </a>
      <Link
        href="/s/oshicart-demo"
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-warm bg-white px-5 text-sm font-black text-walnut transition-colors hover:bg-sand-2"
      >
        <Store size={16} className="text-acacia" />
        Demo store
      </Link>
      <Link
        href="/agents/terms"
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-warm bg-white px-5 text-sm font-black text-walnut transition-colors hover:bg-sand-2"
      >
        Agent rules
      </Link>
    </div>
  );
}

/**
 * A referral agent's own view of their programme.
 *
 * Everything on this page is scoped in the database, not here: `referrers` and
 * `referral_payouts` are read through the caller's own session so RLS
 * (migration 082) picks the rows, and the referred stores come from
 * get_my_referred_merchants(), which is hard-filtered on auth.uid() and returns
 * only store name, live flag, join date and plan. There is deliberately no
 * `.eq("user_id", …)` below — a page filter is not a security boundary in this
 * codebase, and adding one would imply it were.
 */
export default async function AgentDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <SignedOut />;

  const { data: referrer } = await supabase
    .from("referrers")
    .select("id, code, name, status, is_active, created_at, accepted_terms_at")
    .maybeSingle();

  if (!referrer) return <NotLinked email={user.email ?? null} />;

  // Fetched for every linked agent, including one who was later paused or
  // rejected: someone who is owed money must still be able to see what is owed.
  const [{ data: merchantRows }, { data: payoutRows }, { data: ownMerchantRows }] =
    await Promise.all([
      supabase.rpc("get_my_referred_merchants"),
      supabase
        .from("referral_payouts")
        .select("merchant_id, commission_nad, paid_reference, paid_at"),
      // Their own store, if any — one login owns at most one (unique_user),
      // so this decides whether a practice store can exist for them.
      // Through the owner RPC rather than a direct select: is_demo is outside
      // the merchants column grant, and get_my_merchant() is already the way
      // this codebase reads the caller's own row.
      supabase.rpc("get_my_merchant"),
    ]);

  // get_my_merchant() returns a set, so it arrives as an array of one.
  const ownMerchant = (
    Array.isArray(ownMerchantRows) ? ownMerchantRows[0] : ownMerchantRows
  ) as { store_slug?: string; is_demo?: boolean } | null | undefined;

  const ledger = buildReferralLedger(
    (merchantRows as ReferredMerchant[] | null) ?? [],
    (payoutRows as ReferralPayout[] | null) ?? []
  );

  const approved = referrer.status === "active";
  const link = `${SITE_URL}/r/${referrer.code}`;

  return (
    <div className={shell}>
      <PublicNavbar />

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-black tracking-tight text-walnut">
          Hi {referrer.name.split(/\s+/)[0]}
        </h1>
        <p className="mt-1 text-sm text-walnut-2">
          Your OshiCart referral agent dashboard.
        </p>

        {/* 1. Where the application stands */}
        <div className={`mt-6 ${cardWarm}`}>
          {referrer.status === "pending" ? (
            <div className="flex items-start gap-3">
              <Clock size={18} className="mt-0.5 shrink-0 text-terracotta" />
              <div>
                <h2 className="text-sm font-black text-walnut">Application under review</h2>
                <p className="mt-1 text-sm leading-6 text-walnut-2">
                  We received your application on{" "}
                  {formatNamibianDate(referrer.created_at, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  and reply on WhatsApp, usually within a day. Your code{" "}
                  <b>{referrer.code}</b> starts crediting signups the moment
                  you&apos;re approved — until then it credits nothing, so
                  don&apos;t share it yet.
                </p>
              </div>
            </div>
          ) : referrer.status === "rejected" ? (
            <div className="flex items-start gap-3">
              <ShieldAlert size={18} className="mt-0.5 shrink-0 text-walnut-2" />
              <div>
                <h2 className="text-sm font-black text-walnut">Application not approved</h2>
                <p className="mt-1 text-sm leading-6 text-walnut-2">
                  This application wasn&apos;t approved. If you think that was a
                  mistake, message us on WhatsApp and we&apos;ll look again.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-acacia" />
              <div>
                <h2 className="text-sm font-black text-walnut">
                  Approved agent{referrer.is_active ? "" : " — paused"}
                </h2>
                <p className="mt-1 text-sm leading-6 text-walnut-2">
                  {referrer.is_active
                    ? "Your code is live. Every store that signs up through your link is credited to you."
                    : "Your code is paused, so new signups won't be credited to it. Bounties already earned are still yours — message us on WhatsApp to reactivate."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 2. The link, only once it actually credits anything */}
        {approved && <ShareLinkCard code={referrer.code} url={link} />}

        {/* 2b. Somewhere to rehearse before using that link on a real shop */}
        {approved && (
          <PracticeStoreCard
            existingSlug={ownMerchant?.store_slug ?? null}
            existingIsPractice={ownMerchant?.is_demo ?? false}
          />
        )}

        {/* 3. Money, before the detail — it is the reason they opened the page */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Earned in total", value: ledger.earnedNad, tone: "text-walnut" },
            { label: "Waiting to be paid", value: ledger.pendingNad, tone: "text-acacia" },
            { label: "Paid out to you", value: ledger.paidNad, tone: "text-walnut" },
          ].map((s) => (
            <div key={s.label} className={cardWarm}>
              <p className="text-xs font-black uppercase tracking-wide text-walnut-2">
                {s.label}
              </p>
              <p className={`mt-1 text-2xl font-black ${s.tone}`}>
                {formatBounty(s.value)}
              </p>
            </div>
          ))}
        </div>

        {/* 4. Referred stores and how far each one has got */}
        <div className={`mt-8 ${cardWarm}`}>
          <h2 className="text-sm font-black uppercase tracking-wide text-walnut-2">
            Your stores ({ledger.rows.length})
          </h2>
          {ledger.rows.length === 0 ? (
            <p className="mt-3 text-sm leading-6 text-walnut-2">
              {approved
                ? "No stores yet. Share your link with a business that sells on WhatsApp — the first one is the hardest."
                : "Stores you refer will appear here once your code is approved."}
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-walnut-2">
                  <tr>
                    <th className="py-2 font-black">Store</th>
                    <th className="font-black">Joined</th>
                    <th className="font-black">Progress</th>
                    <th className="font-black">Plan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-warm">
                  {ledger.rows.map((r) => (
                    <tr key={r.merchantId}>
                      <td className="py-2.5 pr-3 font-bold text-walnut">{r.storeName}</td>
                      <td className="pr-3 text-walnut-2">
                        {formatNamibianDate(r.joinedAt, { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="pr-3">
                        <span
                          className={
                            r.milestone === "subscribed"
                              ? "rounded-full bg-acacia-soft px-2 py-0.5 text-xs font-black text-acacia-ink"
                              : r.milestone === "store_live"
                                ? "rounded-full bg-terracotta-soft px-2 py-0.5 text-xs font-black text-terracotta"
                                : "rounded-full bg-sand-2 px-2 py-0.5 text-xs font-black text-walnut-2"
                          }
                        >
                          {MILESTONE_LABELS[r.milestone]}
                        </span>
                      </td>
                      <td className="text-walnut-2">
                        {TIER_LABELS[r.tier as SubscriptionTier] ?? r.tier}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs leading-5 text-walnut-2">
            Store name and progress only — a merchant&apos;s customers, orders
            and payment details are theirs, and never shown here.
          </p>
        </div>

        {/* 5. The ledger: what each store is worth, and whether it has been paid */}
        {ledger.rows.length > 0 && (
          <div className={`mt-8 ${cardWarm}`}>
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-walnut-2">
              <Wallet size={15} className="text-acacia" />
              Commissions
            </h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-walnut-2">
                  <tr>
                    <th className="py-2 font-black">Store</th>
                    <th className="font-black">Status</th>
                    <th className="text-right font-black">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-warm">
                  {ledger.rows.map((r) => (
                    <tr key={r.merchantId}>
                      <td className="py-2.5 pr-3 font-bold text-walnut">{r.storeName}</td>
                      <td className="pr-3 text-walnut-2">
                        {r.commission === "paid" ? (
                          <>
                            Paid
                            {r.paidAt
                              ? ` ${formatNamibianDate(r.paidAt, { day: "numeric", month: "short", year: "numeric" })}`
                              : ""}
                            {r.paidReference ? ` · ${r.paidReference}` : ""}
                          </>
                        ) : r.commission === "pending" ? (
                          "Owed to you — payout by EFT"
                        ) : (
                          "Not yet — earns when they pay for a plan"
                        )}
                      </td>
                      <td
                        className={`text-right font-black ${
                          r.commission === "pending" ? "text-acacia" : "text-walnut"
                        }`}
                      >
                        {r.amountNad > 0 ? formatBounty(r.amountNad) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs leading-5 text-walnut-2">
              A bounty is owed once a store you referred is actually paying for
              a plan, and is paid by EFT to the bank account on your
              application. To change that account, message us on WhatsApp.
            </p>
          </div>
        )}

        <AgentResources />
      </main>
    </div>
  );
}

/** Nobody is signed in. */
function SignedOut() {
  return (
    <div className={shell}>
      <PublicNavbar />
      <main className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <div className={cardWarm}>
          <LogIn size={20} className="text-acacia" />
          <h1 className="mt-2 text-xl font-black text-walnut">Sign in to your agent dashboard</h1>
          <p className="mt-2 text-sm leading-6 text-walnut-2">
            Your referral link, the stores you&apos;ve signed up and what
            you&apos;re owed all live behind your OshiCart account.
          </p>
          <Link
            href="/login?next=/agents/dashboard"
            className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-acacia px-5 text-sm font-black text-white transition-colors hover:bg-green-700"
          >
            Sign in
          </Link>
          <p className="mt-4 text-sm text-walnut-2">
            Not an agent yet?{" "}
            <Link href="/agents" className="font-bold text-terracotta underline">
              Apply here
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}

/**
 * Signed in, but this account owns no agent code.
 *
 * Linking is done by an admin on purpose — see the security note in migration
 * 082. Neither the email nor the WhatsApp number on an application is verified,
 * so an account may not claim an agent code by matching either of them.
 */
function NotLinked({ email }: { email: string | null }) {
  return (
    <div className={shell}>
      <PublicNavbar />
      <main className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <div className={cardWarm}>
          <h1 className="text-xl font-black text-walnut">
            This account isn&apos;t connected to an agent code
          </h1>
          <p className="mt-2 text-sm leading-6 text-walnut-2">
            You&apos;re signed in{email ? <> as <b>{email}</b></> : null}, but no
            referral agent code is connected to it yet. Message us on WhatsApp
            with the account above and we&apos;ll connect your code — then this
            page shows your link, your stores and your commissions.
          </p>
          <a
            href={supportWhatsAppLink(
              "Hi OshiCart, I'm a referral agent and I'd like my agent code connected to my account."
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-acacia px-5 text-sm font-black text-white transition-colors hover:bg-green-700"
          >
            <WhatsAppIcon size={15} />
            Message us on WhatsApp
          </a>
          <p className="mt-4 text-sm text-walnut-2">
            Haven&apos;t applied yet?{" "}
            <Link href="/agents" className="font-bold text-terracotta underline">
              Apply to become an agent
            </Link>
            .
          </p>
        </div>
        <AgentResources />
      </main>
    </div>
  );
}
