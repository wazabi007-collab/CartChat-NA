import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { TIER_LIMITS, TIER_LABELS, type SubscriptionTier } from "@/lib/tier-limits";
import { SITE_NAME } from "@/lib/constants";
import { isDpoEnabled } from "@/lib/dpo";
import { Check, ArrowLeft } from "lucide-react";
import { PaymentSection } from "./payment-section";

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

          {/* Payment section */}
          <div className="md:col-span-3 space-y-5">
            <PaymentSection
              tier={tier}
              tierLabel={tierLabel}
              priceDisplay={priceDisplay}
              priceNadCents={tierLimit.price_nad}
              reference={reference}
              merchantId={merchantId}
              merchantName={merchantName}
              dpoEnabled={dpoEnabled}
              waLink={waLink}
              bank={OSHICART_BANK}
            />

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
