import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { showBranding, type SubscriptionTier } from "@/lib/tier-limits";
import { getThemeConfig } from "@/lib/industry";
import { getOrderQuota } from "@/lib/order-limit";
import { usablePaymentMethods } from "@/lib/payment-methods";
import { formatNamibianDate } from "@/lib/date";
import { PreviewBanner } from "@/components/storefront/preview-banner";
import { readPreviewState } from "@/lib/preview";
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
    .eq("store_status", "active")
    .single();

  if (!merchant) return { title: "Checkout" };

  return {
    title: `Checkout | ${merchant.store_name}`,
  };
}

export default async function CheckoutPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { previewCookie, userId } = await readPreviewState(supabase);

  // Payment credentials are not readable by anon/authenticated (migration 055),
  // so read them with the service role. This runs server-side only; the buyer
  // receives just this one store's details, never a bulk-enumerable list.
  const service = createServiceClient();
  let merchantQuery = service
    .from("merchants")
    .select(
      "id, user_id, store_name, town, industry, whatsapp_number, bank_name, bank_account_number, bank_account_holder, bank_branch_code, delivery_slots, delivery_fee_nad, accepted_payment_methods, momo_number, ewallet_number, ewallet_provider, pay2cell_number, vat_number, vat_inclusive, pop_required, delivery_estimate, enabled_delivery_providers, paytoday_number, pickup_address"
    )
    .eq("store_slug", slug);
  if (!previewCookie) {
    merchantQuery = merchantQuery.eq("is_active", true).eq("store_status", "active");
  }
  const { data: merchant } = await merchantQuery.single();

  if (!merchant) notFound();

  const isPreview = previewCookie && !!userId && merchant.user_id === userId;

  // Fetch subscription
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("tier, status")
    .eq("merchant_id", merchant.id)
    .single();

  const tier = (subscription?.tier ?? "oshi_start") as SubscriptionTier;
  const isSoftSuspended = subscription?.status === "soft_suspended";
  const hasBranding = showBranding(tier);

  // Services are derived from the merchant's industry, not a per-product flag.
  const isService = getThemeConfig(merchant.industry)?.isService ?? false;

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

  // Shared with the storefront and product pages so the gates can't drift.
  const quota = await getOrderQuota(supabase, merchant.id, tier);

  if (quota.reached) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg border p-8 max-w-sm text-center">
          <p className="text-lg font-bold text-gray-900">Store Temporarily Unavailable</p>
          <p className="text-sm text-gray-500 mt-2">
            This store has reached its monthly order limit. It can accept new
            orders again from {formatNamibianDate(quota.resetsAt)}, or you can
            contact the merchant directly.
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

  // Only offer methods the merchant can actually be paid through. Ticking a
  // method in settings never required entering its details, so stores were
  // offering bank transfer with no account number and eWallet with no number —
  // the buyer picked one and got "—" to pay into.
  const availablePaymentMethods = usablePaymentMethods(
    merchant.accepted_payment_methods,
    merchant
  );

  if (availablePaymentMethods.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg border p-8 max-w-sm text-center">
          <p className="text-lg font-bold text-gray-900">Can&apos;t check out right now</p>
          <p className="text-sm text-gray-500 mt-2">
            {merchant.store_name} hasn&apos;t finished setting up their payment
            details, so this order can&apos;t be paid yet. Message them on
            WhatsApp and they can help you directly.
          </p>
          <a
            href={`https://wa.me/${merchant.whatsapp_number.replace(/\D/g, "")}`}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-acacia px-4 text-sm font-bold text-white"
          >
            Message {merchant.store_name}
          </a>
          <Link
            href={`/s/${slug}`}
            className="mt-3 block text-sm text-green-600 hover:underline"
          >
            Back to store
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {isPreview && <PreviewBanner />}
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
          merchantTown={merchant.town ?? null}
          merchantTier={tier}
          isService={isService}
          whatsappNumber={merchant.whatsapp_number}
          bankName={merchant.bank_name}
          bankAccountNumber={merchant.bank_account_number}
          bankAccountHolder={merchant.bank_account_holder}
          bankBranchCode={merchant.bank_branch_code}
          deliverySlots={merchant.delivery_slots as { enabled: boolean; days: number[]; times: string[] } | null}
          deliveryFeeNad={merchant.delivery_fee_nad ?? 0}
          acceptedPaymentMethods={availablePaymentMethods}
          momoNumber={merchant.momo_number ?? null}
          ewalletNumber={merchant.ewallet_number ?? null}
          ewalletProvider={merchant.ewallet_provider ?? null}
          pay2cellNumber={merchant.pay2cell_number ?? null}
          paytodayNumber={merchant.paytoday_number ?? null}
          pickupAddress={merchant.pickup_address ?? null}
          enabledDeliveryProviders={merchant.enabled_delivery_providers?.length ? merchant.enabled_delivery_providers : ["store", "yango", "indrive"]}
          vatNumber={merchant.vat_number ?? null}
          vatInclusive={merchant.vat_inclusive ?? false}
          popRequired={merchant.pop_required ?? false}
          deliveryEstimate={merchant.delivery_estimate ?? null}
          preview={isPreview}
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
