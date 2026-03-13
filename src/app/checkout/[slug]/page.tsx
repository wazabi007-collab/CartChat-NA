import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { TIER_LIMITS, showBranding, type SubscriptionTier } from "@/lib/tier-limits";
import { CheckoutForm } from "./checkout-form";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: merchant } = await supabase
    .from("merchants")
    .select("store_name")
    .eq("store_slug", slug)
    .eq("is_active", true)
    .single();

  if (!merchant) return { title: "Checkout" };

  return {
    title: `Checkout | ${merchant.store_name} | ${SITE_NAME}`,
  };
}

export default async function CheckoutPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: merchant } = await supabase
    .from("merchants")
    .select(
      "id, store_name, whatsapp_number, bank_name, bank_account_number, bank_account_holder, bank_branch_code, delivery_slots, delivery_fee_nad, accepted_payment_methods, momo_number, ewallet_number, ewallet_provider"
    )
    .eq("store_slug", slug)
    .eq("is_active", true)
    .single();

  if (!merchant) notFound();

  // Fetch subscription
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("tier, status")
    .eq("merchant_id", merchant.id)
    .single();

  const tier = (subscription?.tier ?? "oshi_start") as SubscriptionTier;
  const isSoftSuspended = subscription?.status === "soft_suspended";
  const hasBranding = showBranding(tier);

  // Block checkout if soft-suspended
  if (isSoftSuspended) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg border p-8 max-w-sm text-center">
          <p className="text-lg font-bold text-gray-900">Store Temporarily Unavailable</p>
          <p className="text-sm text-gray-500 mt-2">
            This store is not currently accepting orders. Please check back later or contact the merchant directly.
          </p>
          <Link
            href={`/s/${slug}`}
            className="inline-block mt-4 text-sm text-green-600 hover:underline"
          >
            Back to store
          </Link>
        </div>
      </div>
    );
  }

  // Check order limit for tier
  const orderLimit = TIER_LIMITS[tier].orders_per_month;
  let orderLimitReached = false;

  if (orderLimit !== -1) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("merchant_id", merchant.id)
      .gte("created_at", startOfMonth.toISOString());

    orderLimitReached = (count || 0) >= orderLimit;
  }

  if (orderLimitReached) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg border p-8 max-w-sm text-center">
          <p className="text-lg font-bold text-gray-900">Store Temporarily Unavailable</p>
          <p className="text-sm text-gray-500 mt-2">
            This store has reached its monthly order limit. Please try again next month or contact the merchant directly.
          </p>
          <Link
            href={`/s/${slug}`}
            className="inline-block mt-4 text-sm text-green-600 hover:underline"
          >
            Back to store
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-lg font-bold text-gray-900">
            Checkout — {merchant.store_name}
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <CheckoutForm
          merchantId={merchant.id}
          storeName={merchant.store_name}
          storeSlug={slug}
          merchantTier={tier}
          whatsappNumber={merchant.whatsapp_number}
          bankName={merchant.bank_name}
          bankAccountNumber={merchant.bank_account_number}
          bankAccountHolder={merchant.bank_account_holder}
          bankBranchCode={merchant.bank_branch_code}
          deliverySlots={merchant.delivery_slots as { enabled: boolean; days: number[]; times: string[] } | null}
          deliveryFeeNad={merchant.delivery_fee_nad ?? 0}
          acceptedPaymentMethods={merchant.accepted_payment_methods ?? ["eft"]}
          momoNumber={merchant.momo_number ?? null}
          ewalletNumber={merchant.ewallet_number ?? null}
          ewalletProvider={merchant.ewallet_provider ?? null}
        />
      </main>

      <footer className="border-t bg-white mt-8">
        <div className="max-w-2xl mx-auto px-4 py-4 text-center text-xs text-gray-400">
          {hasBranding ? (
            <a href={SITE_URL} className="hover:text-gray-600 transition-colors">
              Powered by {SITE_NAME}
            </a>
          ) : (
            <span>&nbsp;</span>
          )}
        </div>
      </footer>
    </div>
  );
}
