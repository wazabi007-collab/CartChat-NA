import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Eye,
  Package,
  Plus,
  ShieldAlert,
  ShoppingCart,
  Store,
  TrendingUp,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { SITE_URL } from "@/lib/constants";
import { TIER_LIMITS, TIER_LABELS, type SubscriptionTier } from "@/lib/tier-limits";
import { getServiceLabels } from "@/lib/service-labels";
import { GettingStarted } from "@/components/dashboard/getting-started";
import { LocationNudge } from "@/components/dashboard/location-nudge";
import { ShareStoreCard } from "@/components/dashboard/share-store-card";
import { DashboardCommandPanel } from "@/components/dashboard/dashboard-command-panel";
import { QuotaRow } from "@/components/dashboard/quota-row";
import { alertError, alertWarning, alertInfo, alertIcon } from "@/lib/ui";
import { getMonthlyOrderCount } from "@/lib/order-limit";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; resume_checklist?: string }>;
}) {
  const params = await searchParams;
  const isWelcome = params.welcome === "true";
  const resumeChecklist = params.resume_checklist === "true";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: merchant } = await supabase
    .from("merchants")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!merchant) {
    redirect("/dashboard/setup");
  }

  const labels = getServiceLabels(merchant.industry);
  const merchantExt = merchant as typeof merchant & {
    store_link_shared?: boolean;
    getting_started_dismissed?: boolean;
  };

  const service = createServiceClient();

  if (resumeChecklist) {
    await service
      .from("merchants")
      .update({ getting_started_dismissed: false })
      .eq("id", merchant.id);
    redirect("/dashboard");
  }

  const { data: subscription } = await service
    .from("subscriptions")
    .select("tier, status, trial_ends_at, current_period_end, grace_ends_at")
    .eq("merchant_id", merchant.id)
    .single();

  const [productsResult, ordersResult, pendingResult, lowStockResult, totalOrdersResult] =
    await Promise.all([
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("merchant_id", merchant.id),
      supabase
        .from("orders")
        .select("id, subtotal_nad", { count: "exact" })
        .eq("merchant_id", merchant.id)
        .eq("status", "completed"),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("merchant_id", merchant.id)
        .eq("status", "pending"),
      supabase
        .from("products")
        .select("id, name, stock_quantity, low_stock_threshold")
        .eq("merchant_id", merchant.id)
        .eq("track_inventory", true)
        .order("stock_quantity", { ascending: true })
        .limit(5),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("merchant_id", merchant.id),
    ]);

  const lowStockProducts = (lowStockResult.data || []).filter(
    (p) => p.stock_quantity <= (p.low_stock_threshold ?? 5)
  );

  const tier = (subscription?.tier ?? "oshi_start") as SubscriptionTier;
  const tierLimits = TIER_LIMITS[tier];
  const monthlyOrderLimit = tierLimits.orders_per_month;

  // Shared helper — excludes cancelled orders and uses the Namibian month boundary.
  const monthlyOrderCount =
    monthlyOrderLimit === -1 ? 0 : await getMonthlyOrderCount(supabase, merchant.id);

  const productCount = productsResult.count || 0;
  const completedOrders = ordersResult.count || 0;
  const pendingOrders = pendingResult.count || 0;
  const totalRevenue = (ordersResult.data || []).reduce(
    (sum, order) => sum + order.subtotal_nad,
    0
  );
  const totalOrders = totalOrdersResult.count || 0;

  const storeUrl = `/s/${merchant.store_slug}`;
  const storeAbsoluteUrl = `${SITE_URL}/s/${merchant.store_slug}`;
  const now = new Date().getTime();

  const allChecklistComplete =
    productCount > 0 &&
    (merchantExt.store_link_shared ?? false) &&
    totalOrders > 0;
  const showChecklist =
    !allChecklistComplete && !(merchantExt.getting_started_dismissed ?? false);
  const isNewMerchant = productCount === 0;

  return (
    <div className="md:ml-64">
      {merchant.store_status === "suspended" && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-black">Your store is suspended and not visible to customers.</p>
          {merchant.safety_notes && (
            <p className="mt-1 leading-5">{merchant.safety_notes}</p>
          )}
          <a
            href={`https://wa.me/264816274823?text=${encodeURIComponent(
              `Hi OshiCart, my store "${merchant.store_name}" is suspended and I'd like to appeal.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center justify-center rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-red-700"
          >
            Contact support
          </a>
        </div>
      )}
      <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-acacia">
              Store overview
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              {isWelcome ? "Your store is live" : `Welcome, ${merchant.store_name}`}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Manage products, orders, store sharing, and payment checks from one clean workspace.
            </p>
            <a
              href="/guide"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm font-semibold text-terracotta hover:underline"
            >
              Read the setup guide
            </a>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/api/preview/enter?slug=${merchant.store_slug}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
            >
              <Store size={16} />
              Preview store
            </Link>
            <Link
              href="/dashboard/products/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-acacia px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-emerald-900/15 transition hover:bg-emerald-700"
            >
              <Plus size={16} />
              {labels.addItem}
            </Link>
          </div>
        </div>
      </section>

      {(!merchant.region || !merchant.town) && <LocationNudge />}

      {showChecklist && (
        <GettingStarted
          merchantId={merchant.id}
          productCount={productCount}
          orderCount={totalOrders}
          storeLinkShared={merchantExt.store_link_shared ?? false}
          storeUrl={storeAbsoluteUrl}
          storeName={merchant.store_name}
          dismissed={merchantExt.getting_started_dismissed ?? false}
          isWelcome={isWelcome}
          industry={merchant.industry}
        />
      )}

      <ShareStoreCard
        storeUrl={storeAbsoluteUrl}
        storeName={merchant.store_name}
        merchantId={merchant.id}
        storeLinkShared={merchantExt.store_link_shared ?? false}
        compact={!isNewMerchant}
      />

      <DashboardCommandPanel
        productCount={productCount}
        pendingOrders={pendingOrders}
        completedOrders={completedOrders}
        totalOrders={totalOrders}
        totalRevenue={totalRevenue}
        storeUrl={storeUrl}
        itemPlural={labels.itemPlural}
        addItemLabel={labels.addItem}
        setupComplete={allChecklistComplete}
        storeLinkShared={merchantExt.store_link_shared ?? false}
      />

      {subscription?.status === "grace" && (
        <div className={`${alertWarning} mb-6 rounded-2xl p-4`}>
          <AlertTriangle size={20} className={alertIcon} />
          <div>
            <h3 className="font-medium text-amber-900">Subscription Expired</h3>
            <p className="text-sm text-amber-800 mt-1">
              Your {subscription.trial_ends_at ? "trial" : "subscription"} has ended. You have{" "}
              {subscription.grace_ends_at
                ? Math.max(0, Math.ceil((new Date(subscription.grace_ends_at).getTime() - now) / 86400000))
                : 7}{" "}
              days to renew before your store is paused.
            </p>
          </div>
        </div>
      )}

      {subscription?.status === "soft_suspended" && (
        <div className={`${alertError} mb-6 rounded-2xl p-4`}>
          <ShieldAlert size={20} className={alertIcon} />
          <div>
            <h3 className="font-medium text-red-900">Store Paused - Subscription Expired</h3>
            <p className="text-sm text-red-800 mt-1">
              Your subscription has expired and your store is no longer accepting orders. Renew to continue.
              Contact support@oshicart.com for payment details.
            </p>
          </div>
        </div>
      )}

      {subscription && ["trial", "active"].includes(subscription.status) && (() => {
        const endDate = subscription.current_period_end || subscription.trial_ends_at;
        if (!endDate) return null;
        const daysLeft = Math.ceil((new Date(endDate).getTime() - now) / 86400000);
        if (daysLeft > 7) return null;
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <Clock size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-900">
                {subscription.status === "trial" ? "Trial" : "Subscription"} expires in {daysLeft} day{daysLeft !== 1 ? "s" : ""}
              </h3>
              <p className="text-sm text-yellow-800 mt-1">
                {subscription.status === "trial"
                  ? "Upgrade to a paid plan to keep your store running."
                  : "Renew your subscription to avoid interruptions."}
              </p>
            </div>
          </div>
        );
      })()}

      {(() => {
        const renewalDate = subscription?.current_period_end || subscription?.trial_ends_at;
        return (
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Your plan
                </p>
                <h2 className="mt-1 text-lg font-black text-slate-950">{TIER_LABELS[tier]}</h2>
                {renewalDate && (
                  <p className="mt-1 text-xs text-slate-500">
                    {subscription?.status === "trial" ? "Trial ends" : "Renews"}{" "}
                    {new Date(renewalDate).toLocaleDateString("en-NA", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                )}
              </div>
              <Link
                href="/pricing"
                className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-acacia transition hover:bg-slate-50"
              >
                Upgrade plan
                <ArrowRight size={14} />
              </Link>
            </div>
            <div className="mt-4 space-y-4">
              <QuotaRow label={labels.itemPlural} used={productCount} limit={tierLimits.products} />
              {monthlyOrderLimit !== -1 && (
                <QuotaRow label="Orders this month" used={monthlyOrderCount} limit={monthlyOrderLimit} />
              )}
            </div>
          </section>
        );
      })()}

      <div className={`${alertInfo} mb-6 rounded-2xl border-blue-200 bg-blue-50 p-4 shadow-sm shadow-blue-900/5`}>
        <ShieldAlert size={20} className={alertIcon} />
        <div>
          <h3 className="font-semibold text-blue-900">Payment Safety Reminder</h3>
          <p className="text-sm text-blue-800 mt-1">
            Always verify payments by checking your <strong>actual bank balance</strong> or transaction
            history before confirming an order. Screenshots of proof of payment can be faked.
            Only confirm orders after the money has reflected in your account.
          </p>
        </div>
      </div>

      {productCount > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Package size={20} className="text-blue-600" />}
            label={labels.itemPlural}
            value={productCount.toString()}
            href="/dashboard/products"
          />
          <StatCard
            icon={<ShoppingCart size={20} className="text-orange-600" />}
            label="Pending Orders"
            value={pendingOrders.toString()}
            href="/dashboard/orders"
          />
          <StatCard
            icon={<Eye size={20} className="text-purple-600" />}
            label="Completed"
            value={completedOrders.toString()}
            href="/dashboard/orders"
          />
          <StatCard
            icon={<span className="text-green-600 font-black text-lg">N$</span>}
            label="Revenue"
            value={formatPrice(totalRevenue)}
            href="/dashboard/analytics"
          />
        </div>
      )}

      {lowStockProducts.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-8 shadow-sm shadow-orange-900/5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} className="text-orange-600" />
            <h3 className="font-semibold text-orange-900">
              {lowStockProducts.length} {labels.itemPlural.toLowerCase()} low on stock
            </h3>
          </div>
          <ul className="space-y-1">
            {lowStockProducts.map((product) => (
              <li key={product.id} className="text-sm text-orange-800 flex justify-between gap-3">
                <span>{product.name}</span>
                <span className={`font-medium ${product.stock_quantity === 0 ? "text-red-600" : "text-orange-600"}`}>
                  {product.stock_quantity === 0 ? "Out of stock" : `${product.stock_quantity} left`}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/dashboard/products"
            className="inline-flex items-center gap-1 mt-2 text-sm text-orange-700 hover:text-orange-900 font-medium"
          >
            Update stock levels
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Priority actions
              </p>
              <h2 className="mt-1 text-lg font-black text-slate-950">Keep the store moving</h2>
            </div>
            <TrendingUp size={20} className="text-acacia" />
          </div>
          <div className="grid gap-3">
            {pendingOrders > 0 && (
              <QuickAction
                href="/dashboard/orders"
                title={`${pendingOrders} pending order${pendingOrders > 1 ? "s" : ""}`}
                description="Review and confirm customer orders"
                variant="warning"
              />
            )}
            {productCount === 0 && (
              <QuickAction
                href="/dashboard/products"
                title={labels.firstItem}
                description={`Add ${labels.itemPlural.toLowerCase()} so customers can start ordering.`}
                variant="primary"
              />
            )}
            {merchantExt.getting_started_dismissed && !allChecklistComplete && (
              <QuickAction
                href="/dashboard?resume_checklist=true"
                title="Resume Getting Started"
                description="Complete your store setup checklist"
                variant="primary"
              />
            )}
            <QuickAction
              href={storeUrl}
              title="View your store"
              description="See what customers see before you share it."
              variant="default"
              external
            />
            <QuickAction
              href="/dashboard/settings"
              title="Store settings"
              description="Update bank details, WhatsApp number, and payment details."
              variant="default"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            Store health
          </p>
          <h2 className="mt-1 text-lg font-black text-slate-950">Operational snapshot</h2>
          <div className="mt-5 space-y-4">
            <HealthRow label={`${labels.itemPlural} listed`} value={productCount} total={Math.max(productCount, 10)} />
            <HealthRow label="Orders completed" value={completedOrders} total={Math.max(totalOrders, 3)} />
            <HealthRow label="Setup complete" value={allChecklistComplete ? 4 : productCount > 0 ? 3 : 1} total={4} />
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <div className={`bg-white rounded-2xl border border-slate-200 p-5 shadow-sm shadow-slate-900/5 ${href ? "hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer" : ""}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50">
          {icon}
        </span>
        <span className="text-xs text-slate-500 font-bold">{label}</span>
      </div>
      <p className="text-xl sm:text-2xl font-black text-slate-950 truncate" title={value}>{value}</p>
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

function QuickAction({
  href,
  title,
  description,
  variant,
  external,
}: {
  href: string;
  title: string;
  description: string;
  variant: "primary" | "warning" | "default";
  external?: boolean;
}) {
  const colors = {
    primary: "border-emerald-200 bg-emerald-50",
    warning: "border-orange-200 bg-orange-50",
    default: "border-slate-200 bg-white",
  };

  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      className={`flex items-center justify-between gap-4 p-4 rounded-2xl border ${colors[variant]} hover:shadow-sm transition-shadow`}
    >
      <div>
        <p className="font-bold text-slate-950">{title}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <ArrowRight size={18} className="text-slate-400 shrink-0" />
    </Link>
  );
}

function HealthRow({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const percentage = Math.min(100, Math.round((value / Math.max(total, 1)) * 100));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-black text-slate-950">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-terracotta to-acacia"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
