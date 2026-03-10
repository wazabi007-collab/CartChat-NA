import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Package, ShoppingCart, Eye, ArrowRight } from "lucide-react";
import { formatPrice } from "@/lib/utils";

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

  // Fetch stats
  const [productsResult, ordersResult, pendingResult] = await Promise.all([
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
  ]);

  const productCount = productsResult.count || 0;
  const completedOrders = ordersResult.count || 0;
  const pendingOrders = pendingResult.count || 0;
  const totalRevenue = (ordersResult.data || []).reduce(
    (sum, o) => sum + o.subtotal_nad,
    0
  );

  const storeUrl = `/s/${merchant.store_slug}`;

  return (
    <div className="md:ml-56">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {merchant.store_name}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Your store:{" "}
          <Link
            href={storeUrl}
            className="text-green-600 hover:underline"
            target="_blank"
          >
            chatcartna.com{storeUrl}
          </Link>
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Package size={20} className="text-blue-600" />}
          label="Products"
          value={productCount.toString()}
        />
        <StatCard
          icon={<ShoppingCart size={20} className="text-orange-600" />}
          label="Pending Orders"
          value={pendingOrders.toString()}
        />
        <StatCard
          icon={<Eye size={20} className="text-purple-600" />}
          label="Completed"
          value={completedOrders.toString()}
        />
        <StatCard
          icon={<span className="text-green-600 font-bold text-lg">N$</span>}
          label="Revenue"
          value={formatPrice(totalRevenue)}
        />
      </div>

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
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
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
      className={`flex items-center justify-between p-4 rounded-lg border ${colors[variant]} hover:shadow-sm transition-shadow`}
    >
      <div>
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <ArrowRight size={18} className="text-gray-400" />
    </Link>
  );
}
