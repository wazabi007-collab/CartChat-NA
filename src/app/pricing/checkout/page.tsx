import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { TIER_LIMITS, TIER_LABELS, type SubscriptionTier } from "@/lib/tier-limits";
import { SITE_NAME } from "@/lib/constants";
import { isDpoEnabled } from "@/lib/dpo";
import { Check, ArrowLeft, MessageCircle, CreditCard } from "lucide-react";
import { CopyButton } from "./copy-button";
import { DpoPayButton } from "./dpo-pay-button";

const VALID_TIERS: SubscriptionTier[] = ["oshi_basic", "oshi_grow", "oshi_pro"];

const OSHICART_BANK = {
  bank: "Nedbank Namibia",
  accountHolder: "Octovia Nexus Investment CC",
  accountNumber: "11991049349",
  branchCode: "461-089",
  accountType: "Current Account",
};

const OSHICART_WHATSAPP = "+264816274823";

const TIER_FEATURES: Record<string, string[]> = {
  oshi_basic: [
    "30 products",
    "200 orders/month",
    "No OshiCart branding on your store",
    "Sales analytics",
    "WhatsApp order notifications",
    "EFT, COD, MoMo, eWallet payments",
  ],
  oshi_grow: [
    "200 products",
    "500 orders/month",
    "Inventory tracking",
    "Coupon & discount codes",
    "Everything in Basic",
  ],
  oshi_pro: [
    "Unlimited products",
    "Unlimited orders",
    "Priority support",
    "All features included",
    "Everything in Grow",
  ],
};

interface Props {
  searchParams: Promise<{ tier?: string }>;
}

export default async function SubscriptionCheckoutPage({ searchParams }: Props) {
  const { tier: tierParam } = await searchParams;
  const tier = (tierParam || "oshi_basic") as SubscriptionTier;

  if (!VALID_TIERS.includes(tier)) redirect("/#pricing");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let merchantName = "";
  let merchantId = "";
  if (user) {
    const { data: merchant } = await supabase
      .from("merchants")
      .select("id, store_name")
      .eq("user_id", user.id)
      .single();
    if (merchant) {
      merchantName = merchant.store_name;
      merchantId = merchant.id;
    }
  }

  const tierLimit = TIER_LIMITS[tier];
  const tierLabel = TIER_LABELS[tier];
  const priceNad = tierLimit.price_nad / 100;
  const priceDisplay = `N$${priceNad.toLocaleString()}`;
  const features = TIER_FEATURES[tier] || [];
  const refSuffix = tier.replace("oshi_", "").toUpperCase();
  const reference = merchantId
    ? `OSHI-${refSuffix}-${merchantId.slice(0, 8).toUpperCase()}`
    : `OSHI-${refSuffix}`;

  // Save pending tier + reference on the subscription so admin can see it
  if (merchantId) {
    await supabase
      .from("subscriptions")
      .update({ pending_tier: tier, payment_reference: reference })
      .eq("merchant_id", merchantId);
  }

  const dpoEnabled = isDpoEnabled();

  const waText = merchantName
    ? `Hi OshiCart! I would like to upgrade to the ${tierLabel} plan (${priceDisplay}/mo) for my store "${merchantName}". My reference: ${reference}`
    : `Hi OshiCart! I would like to subscribe to the ${tierLabel} plan (${priceDisplay}/mo). My reference: ${reference}`;
  const waLink = `https://wa.me/${OSHICART_WHATSAPP.replace(/\D/g, "")}?text=${encodeURIComponent(waText)}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <Image src="/logo.svg" alt={SITE_NAME} width={120} height={32} />
          </Link>
          <Link href="/#pricing" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
            <ArrowLeft size={14} />
            Back to pricing
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-5 gap-6">
          {/* Plan summary */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl border p-6 md:sticky md:top-8">
              <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold">Your plan</p>
              <h2 className="text-2xl font-bold text-gray-900 mt-1">{tierLabel}</h2>
              <div className="mt-3">
                <span className="text-3xl font-bold text-gray-900">{priceDisplay}</span>
                <span className="text-gray-500 text-sm">/month</span>
              </div>

              <ul className="mt-6 space-y-2.5">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check size={16} className="text-green-600 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-6 pt-4 border-t">
                <p className="text-xs text-gray-400 mb-2">Switch plan</p>
                <div className="flex gap-1.5 flex-wrap">
                  {VALID_TIERS.map((t) => (
                    <Link
                      key={t}
                      href={`/pricing/checkout?tier=${t}`}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        t === tier
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {TIER_LABELS[t]}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Payment options */}
          <div className="md:col-span-3 space-y-5">

            {/* DPO Online Payment — shown first when enabled */}
            {dpoEnabled && merchantId && (
              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
                  <div className="flex items-center gap-2">
                    <CreditCard size={20} className="text-white" />
                    <h3 className="text-white font-bold text-lg">Pay Online with Card</h3>
                  </div>
                  <p className="text-blue-200 text-sm mt-0.5">
                    Instant activation — pay securely with Visa, Mastercard, or mobile money
                  </p>
                </div>

                <div className="px-6 py-5 space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Amount</span>
                    <span className="font-bold text-gray-900 text-base">{priceDisplay} / month</span>
                  </div>

                  <DpoPayButton
                    tier={tier}
                    merchantId={merchantId}
                    storeName={merchantName}
                    reference={reference}
                    priceNadCents={tierLimit.price_nad}
                  />

                  <p className="text-xs text-center text-gray-400">
                    Secured by DPO Group — Visa, Mastercard, and mobile payments accepted
                  </p>
                </div>
              </div>
            )}

            {/* Divider between payment options */}
            {dpoEnabled && merchantId && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-gradient-to-br from-gray-50 to-gray-100 px-3 text-gray-400">or pay via EFT</span>
                </div>
              </div>
            )}

            {/* EFT Payment (existing) */}
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-5">
                <h3 className="text-white font-bold text-lg">
                  {dpoEnabled && merchantId ? "Pay via Bank Transfer (EFT)" : "Payment Details"}
                </h3>
                <p className="text-gray-400 text-sm mt-0.5">
                  Pay via EFT and we&apos;ll activate your plan within 24 hours
                </p>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                  <p className="text-xs uppercase tracking-widest text-green-600 font-semibold mb-1">
                    Your Payment Reference
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-lg text-gray-900">{reference}</span>
                    <CopyButton text={reference} />
                  </div>
                  <p className="text-xs text-green-700 mt-1">
                    Use this as your EFT payment reference
                  </p>
                </div>

                <div className="space-y-2.5">
                  <PaymentRow label="Bank" value={OSHICART_BANK.bank} />
                  <PaymentRow label="Account Holder" value={OSHICART_BANK.accountHolder} />
                  <PaymentRow label="Account Number" value={OSHICART_BANK.accountNumber} />
                  <PaymentRow label="Branch Code" value={OSHICART_BANK.branchCode} />
                  <PaymentRow label="Account Type" value={OSHICART_BANK.accountType} />
                  <div className="border-t border-gray-100 pt-2">
                    <PaymentRow label="Amount" value={`${priceDisplay} / month`} bold />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border px-6 py-5">
              <h4 className="font-semibold text-gray-900 mb-3">How EFT works</h4>
              <ol className="space-y-3">
                <Step num={1}>Make an EFT payment of <strong>{priceDisplay}</strong> using the reference above</Step>
                <Step num={2}>Send us proof of payment on WhatsApp (screenshot or reference number)</Step>
                <Step num={3}>We&apos;ll activate your <strong>{tierLabel}</strong> plan within 24 hours</Step>
              </ol>
            </div>

            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-green-600/20"
            >
              <MessageCircle size={18} />
              Send Proof of Payment via WhatsApp
            </a>

            {!user && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-center">
                <p className="text-sm text-amber-800">
                  Don&apos;t have a store yet?{" "}
                  <Link href={`/signup?tier=${tier}`} className="font-semibold underline hover:text-amber-900">
                    Sign up free
                  </Link>
                  {" "}&mdash; you&apos;ll be redirected here after setup.
                </p>
              </div>
            )}

            <p className="text-center text-xs text-gray-400">
              Questions? WhatsApp us at {OSHICART_WHATSAPP}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function PaymentRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={bold ? "font-bold text-gray-900 text-base" : "text-gray-900 font-medium"}>{value}</span>
    </div>
  );
}

function Step({ num, children }: { num: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">
        {num}
      </span>
      <span className="text-sm text-gray-700 pt-0.5">{children}</span>
    </li>
  );
}
