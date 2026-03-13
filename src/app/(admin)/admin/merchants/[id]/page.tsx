import { createServiceClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import { TIER_LABELS, TIER_COLORS, STATUS_LABELS, type SubscriptionTier, type SubscriptionStatus } from "@/lib/tier-limits";
import { STORE_STATUS_LABELS } from "@/lib/constants";
import Link from "next/link";
import { MerchantTabs } from "./merchant-tabs";

export default async function MerchantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = createServiceClient();

  const [merchantRes, subRes, paymentsRes, productsRes, ordersRes, actionsRes] = await Promise.all([
    service.from("merchants").select("*").eq("id", id).single(),
    service.from("subscriptions").select("*").eq("merchant_id", id).single(),
    service.from("payments").select("*").eq("merchant_id", id).is("voided_at", null).order("created_at", { ascending: false }),
    service.from("products").select("id, name, price_nad, track_inventory, stock_quantity").eq("merchant_id", id),
    service.from("orders").select("id, order_number, customer_name, subtotal_nad, delivery_fee_nad, discount_nad, status, payment_method, created_at").eq("merchant_id", id).order("created_at", { ascending: false }),
    service.from("admin_actions").select("*, admin_users(email)").eq("target_id", id).order("created_at", { ascending: false }).limit(50),
  ]);

  if (!merchantRes.data) notFound();

  const merchant = merchantRes.data;
  const subscription = subRes.data;
  const storeStatus = STORE_STATUS_LABELS[merchant.store_status] || { label: merchant.store_status, color: "bg-gray-100 text-gray-800" };
  const tierLabel = subscription ? TIER_LABELS[subscription.tier as SubscriptionTier] : "—";
  const tierColor = subscription ? TIER_COLORS[subscription.tier as SubscriptionTier] : "";
  const subStatus = subscription ? STATUS_LABELS[subscription.status as SubscriptionStatus] : null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href="/admin/merchants" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
          &larr; Back to Merchants
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{merchant.store_name}</h1>
          <span className={`text-xs px-2 py-0.5 rounded-full ${storeStatus.color}`}>{storeStatus.label}</span>
          {subscription && (
            <>
              <span className={`text-xs px-2 py-0.5 rounded-full ${tierColor}`}>{tierLabel}</span>
              {subStatus && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${subStatus.color}`}>{subStatus.label}</span>
              )}
            </>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1">/{merchant.store_slug}</p>
        {subscription?.pending_tier && subscription.pending_tier !== subscription.tier && (
          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 inline-flex items-center gap-2 text-sm">
            <span className="text-amber-700">
              Upgrade requested: <strong>{TIER_LABELS[subscription.pending_tier as SubscriptionTier] || subscription.pending_tier}</strong>
            </span>
            {subscription.payment_reference && (
              <span className="font-mono text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                {subscription.payment_reference}
              </span>
            )}
          </div>
        )}
      </div>

      <MerchantTabs
        merchant={merchant}
        subscription={subscription}
        payments={paymentsRes.data || []}
        products={productsRes.data || []}
        orders={ordersRes.data || []}
        actions={actionsRes.data || []}
      />
    </div>
  );
}
