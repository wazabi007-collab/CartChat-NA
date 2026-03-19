import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Package, ShoppingCart, Eye, ArrowRight, AlertTriangle, ShieldAlert, Clock } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { SITE_URL } from "@/lib/constants";
import { CopyStoreLink } from "./copy-store-link";
import {
  card,
  alertError,
  alertWarning,
  alertInfo,
  alertIcon,
} from "@/lib/ui";

export default async function DashboardPage() {
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

  // Fetch subscription status
  const service = createServiceClient();
  const { data: subscription } = await service
    .from("subscriptions")
    .select("tier, status, trial_ends_at, current_period_end, grace_ends_at")
    .eq("merchant_id", merchant.id)
    .single();

  // Fetch stats
  const [productsResult, ordersResult, pendingResult, lowStockResult] = await Promise.all([
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
  ]);

  const lowStockProducts = (lowStockResult.data || []).filter(
    (p) => p.stock_quantity <= (p.low_stock_threshold ?? 5)
  );

  const productCount = productsResult.count || 0;
  const completedOrders = ordersResult.count || 0;
  const pendingOrders = pendingResult.count || 0;
  const totalRevenue = (ordersResult.data || []).reduce(
    (sum, o) => sum + o.subtotal_nad,
    0
  );

  const storeUrl = `/s/${merchant.store_slug}`;
  const storeAbsoluteUrl = `${SITE_URL}/s/${merchant.store_slug}`;
  const now = new Date().getTime();

  return (
    <div className="md:ml-56">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {merchant.store_name}
        </h1>
      </div>

      {/* Share Store Card */}
      <CopyStoreLink url={storeAbsoluteUrl} />

      {/* Store status banner */}
      {merchant.store_status === "suspended" && (
        <div className={`${alertError} mb-6`}>
          <ShieldAlert size={20} className={alertIcon} />
          <div>
            <h3 className="font-medium text-red-900">Store Suspended</h3>
            <p className="text-sm text-red-800 mt-1">
              Your store has been suspended. Customers cannot view your store or place orders.
              Please contact support at support@oshicart.com to resolve this.
            </p>
          </div>
        </div>
      )}

      {/* Subscription warning banners */}
      {subscription?.status === "grace" && (
        <div className={`${alertWarning} mb-6`}>
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
        <div className={`${alertError} mb-6`}>
          <ShieldAlert size={20} className={alertIcon} />
          <div>
            <h3 className="font-medium text-red-900">Store Paused — Subscription Expired</h3>
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
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-start gap-3">
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

      {/* POP Education Banner (TRUST-08) */}
      <div className={`${alertInfo} mb-6`}>
        <ShieldAlert size={20} className={alertIcon} />
        <div>
          <h3 className="font-medium text-blue-900">Payment Safety Reminder</h3>
          <p className="text-sm text-blue-800 mt-1">
            Always verify payments by checking your <strong>actual bank balance</strong> or transaction
            history before confirming an order. Screenshots of proof of payment can be faked.
            Only confirm orders after the money has reflected in your account.
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Package size={20} className="text-blue-600" />}
          label="Products"
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
          icon={<span className="text-green-600 font-bold text-lg">N$</span>}
          label="Revenue"
          value={formatPrice(totalRevenue)}
          href="/dashboard/analytics"
        />
      </div>

      {/* Low stock warning */}
      {lowStockProducts.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} className="text-orange-600" />
            <h3 className="font-semibold text-orange-900">
              {lowStockProducts.length} product{lowStockProducts.length > 1 ? "s" : ""} low on stock
            </h3>
          </div>
          <ul className="space-y-1">
            {lowStockProducts.map((p) => (
              <li key={p.id} className="text-sm text-orange-800 flex justify-between">
                <span>{p.name}</span>
                <span className={`font-medium ${p.stock_quantity === 0 ? "text-red-600" : "text-orange-600"}`}>
                  {p.stock_quantity === 0 ? "Out of stock" : `${p.stock_quantity} left`}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/dashboard/products"
            className="inline-block mt-2 text-sm text-orange-700 hover:text-orange-900 font-medium"
          >
            Update stock levels →
          </Link>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid md:grid-cols-2 gap-4">
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
            title="Add your first product"
            description="Get started by adding products to your catalog"
            variant="primary"
          />
        )}
        <QuickAction
          href={storeUrl}
          title="View your store"
          description="See what your customers see"
          variant="default"
          external
        />
        <QuickAction
          href="/dashboard/settings"
          title="Store settings"
          description="Update bank details, WhatsApp number, and more"
          variant="default"
        />
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
    <div className={`bg-white rounded-xl border border-gray-200 p-4 ${href ? "hover:shadow-sm hover:border-gray-300 transition-all cursor-pointer" : ""}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate" title={value}>{value}</p>
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
    primary: "border-green-200 bg-green-50",
    warning: "border-orange-200 bg-orange-50",
    default: "border-gray-200 bg-white",
  };

  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      className={`flex items-center justify-between p-4 rounded-xl border ${colors[variant]} hover:shadow-sm transition-shadow`}
    >
      <div>
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <ArrowRight size={18} className="text-gray-400" />
    </Link>
  );
}
