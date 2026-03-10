import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatPrice } from "@/lib/utils";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!merchant) redirect("/dashboard/setup");
  const merchantId = merchant!.id;

  // Get last 30 days of analytics
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: analytics } = await supabase
    .from("store_analytics")
    .select("*")
    .eq("merchant_id", merchantId)
    .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
    .order("date", { ascending: false });

  const totals = (analytics || []).reduce(
    (acc, day) => ({
      views: acc.views + day.page_views,
      orders: acc.orders + day.orders_placed,
      confirmed: acc.confirmed + day.orders_confirmed,
      revenue: acc.revenue + day.revenue_nad,
    }),
    { views: 0, orders: 0, confirmed: 0, revenue: 0 }
  );

  // Top products
  const { data: topProducts } = await supabase
    .from("order_items")
    .select("product_name, quantity")
    .in(
      "order_id",
      (
        await supabase
          .from("orders")
          .select("id")
          .eq("merchant_id", merchantId)
          .eq("status", "completed")
      ).data?.map((o) => o.id) || []
    );

  // Aggregate top products
  const productMap = new Map<string, number>();
  (topProducts || []).forEach((item) => {
    productMap.set(
      item.product_name,
      (productMap.get(item.product_name) || 0) + item.quantity
    );
  });
  const topList = Array.from(productMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="md:ml-56">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Analytics{" "}
        <span className="text-sm font-normal text-gray-400">Last 30 days</span>
      </h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs text-gray-500">Page Views</p>
          <p className="text-2xl font-bold text-gray-900">{totals.views}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs text-gray-500">Orders Placed</p>
          <p className="text-2xl font-bold text-gray-900">{totals.orders}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs text-gray-500">Orders Confirmed</p>
          <p className="text-2xl font-bold text-gray-900">
            {totals.confirmed}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs text-gray-500">Revenue</p>
          <p className="text-2xl font-bold text-green-600">
            {formatPrice(totals.revenue)}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Daily breakdown */}
        <div className="bg-white rounded-lg border p-4">
          <h2 className="font-medium text-gray-900 mb-3">Daily Activity</h2>
          {!analytics || analytics.length === 0 ? (
            <p className="text-sm text-gray-400">
              No data yet. Analytics start tracking when customers visit your
              store.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {analytics.map((day) => (
                <div
                  key={day.id}
                  className="flex justify-between text-sm py-1 border-b border-gray-50"
                >
                  <span className="text-gray-600">
                    {new Date(day.date).toLocaleDateString("en-NA", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <div className="flex gap-4 text-gray-500">
                    <span>{day.page_views} views</span>
                    <span>{day.orders_placed} orders</span>
                    <span className="text-green-600">
                      {formatPrice(day.revenue_nad)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top products */}
        <div className="bg-white rounded-lg border p-4">
          <h2 className="font-medium text-gray-900 mb-3">
            Top Selling Products
          </h2>
          {topList.length === 0 ? (
            <p className="text-sm text-gray-400">
              Complete some orders to see your top products.
            </p>
          ) : (
            <div className="space-y-2">
              {topList.map(([name, qty], i) => (
                <div
                  key={name}
                  className="flex justify-between text-sm py-1"
                >
                  <span className="text-gray-600">
                    <span className="text-gray-400 mr-2">{i + 1}.</span>
                    {name}
                  </span>
                  <span className="text-gray-500">{qty} sold</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
