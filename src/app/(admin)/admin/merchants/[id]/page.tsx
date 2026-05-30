import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ExternalLink, ShieldAlert, ShoppingBag } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { STORE_STATUS_LABELS } from "@/lib/constants";
import {
  STATUS_LABELS,
  TIER_COLORS,
  TIER_LABELS,
  type SubscriptionStatus,
  type SubscriptionTier,
} from "@/lib/tier-limits";
import { MerchantTabs } from "./merchant-tabs";
import { requireAdminPermission } from "@/lib/admin-auth";

export default async function MerchantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPermission("view_merchant_detail");
  const { id } = await params;
  const service = createServiceClient();

  const [merchantRes, subRes, paymentsRes, productsRes, ordersRes, actionsRes, safetyRes, reportsRes] =
    await Promise.all([
      service.from("merchants").select("*").eq("id", id).single(),
      service.from("subscriptions").select("*").eq("merchant_id", id).single(),
      service.from("payments").select("*").eq("merchant_id", id).is("voided_at", null).order("created_at", { ascending: false }),
      service
        .from("products")
        .select("id, name, price_nad, track_inventory, stock_quantity, is_available, moderation_status, moderation_reasons")
        .eq("merchant_id", id),
      service
        .from("orders")
        .select("id, order_number, customer_name, subtotal_nad, delivery_fee_nad, discount_nad, status, payment_method, created_at")
        .eq("merchant_id", id)
        .order("created_at", { ascending: false }),
      service.from("admin_actions").select("*, admin_users(email)").eq("target_id", id).order("created_at", { ascending: false }).limit(50),
      service.from("safety_reviews").select("*").eq("merchant_id", id).order("created_at", { ascending: false }).limit(50),
      service.from("reports").select("*").eq("merchant_id", id).order("created_at", { ascending: false }).limit(50),
    ]);

  if (!merchantRes.data) notFound();

  const merchant = merchantRes.data;
  const subscription = subRes.data;
  const products = productsRes.data || [];
  const orders = ordersRes.data || [];
  const safetyReviews = safetyRes.data || [];
  const reports = reportsRes.data || [];
  const storeStatus = STORE_STATUS_LABELS[merchant.store_status] || {
    label: merchant.store_status,
    color: "bg-gray-100 text-gray-800",
  };
  const tierLabel = subscription ? TIER_LABELS[subscription.tier as SubscriptionTier] : "No plan";
  const tierColor = subscription ? TIER_COLORS[subscription.tier as SubscriptionTier] : "bg-slate-100 text-slate-600";
  const subStatus = subscription ? STATUS_LABELS[subscription.status as SubscriptionStatus] : null;
  const openSafety = safetyReviews.filter((review) => review.status === "open").length;
  const openReports = reports.filter((report) => report.status === "open").length;
  const totalRevenue = orders
    .filter((order) => order.status !== "cancelled")
    .reduce((sum, order) => sum + (order.subtotal_nad || 0), 0);

  return (
    <div>
      <div className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
        <div className="border-b border-slate-100 p-6">
          <Link href="/admin/merchants" className="mb-3 inline-block text-sm font-bold text-slate-500 hover:text-slate-950">
            Back to merchants
          </Link>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-black tracking-tight text-slate-950">{merchant.store_name}</h1>
                <span className={`rounded-full px-2.5 py-1 text-xs font-black ${storeStatus.color}`}>{storeStatus.label}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-black ${tierColor}`}>{tierLabel}</span>
                {subStatus && <span className={`rounded-full px-2.5 py-1 text-xs font-black ${subStatus.color}`}>{subStatus.label}</span>}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span>/s/{merchant.store_slug}</span>
                <Link href={`/s/${merchant.store_slug}`} target="_blank" className="inline-flex items-center gap-1 font-bold text-blue-600 hover:underline">
                  View live store <ExternalLink size={14} />
                </Link>
              </div>
              {subscription?.pending_tier && subscription.pending_tier !== subscription.tier && (
                <div className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                  <span className="text-amber-700">
                    Upgrade requested: <strong>{TIER_LABELS[subscription.pending_tier as SubscriptionTier] || subscription.pending_tier}</strong>
                  </span>
                  {subscription.payment_reference && (
                    <span className="rounded bg-amber-100 px-2 py-0.5 font-mono text-xs text-amber-800">
                      {subscription.payment_reference}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-4">
          <HeaderMetric icon={ShoppingBag} label="Products" value={products.length} />
          <HeaderMetric icon={ShoppingBag} label="Orders" value={orders.length} />
          <HeaderMetric icon={AlertTriangle} label="Revenue" value={`N$${(totalRevenue / 100).toLocaleString()}`} />
          <HeaderMetric icon={ShieldAlert} label="Open risk" value={openSafety + openReports} highlight={openSafety + openReports > 0} />
        </div>
      </div>

      <MerchantTabs
        merchant={merchant}
        subscription={subscription}
        payments={paymentsRes.data || []}
        products={products}
        orders={orders}
        actions={actionsRes.data || []}
        safetyReviews={safetyReviews}
        reports={reports}
      />
    </div>
  );
}

function HeaderMetric({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: typeof ShoppingBag;
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${highlight ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-950"}`}>
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide opacity-70">
        <Icon size={14} />
        {label}
      </div>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}
