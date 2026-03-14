import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AnalyticsClient } from "@/components/dashboard/analytics-client";

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
  const merchantId = merchant.id;

  // Fetch 180 days of analytics (90 days current + 90 days previous for comparison)
  const halfYearAgo = new Date();
  halfYearAgo.setDate(halfYearAgo.getDate() - 180);

  const [analyticsRes, ordersRes] = await Promise.all([
    supabase
      .from("store_analytics")
      .select("date, page_views, orders_placed, orders_confirmed, revenue_nad")
      .eq("merchant_id", merchantId)
      .gte("date", halfYearAgo.toISOString().split("T")[0])
      .order("date", { ascending: false }),

    // Top products from completed orders (all time)
    supabase
      .from("orders")
      .select("id")
      .eq("merchant_id", merchantId)
      .eq("status", "completed"),
  ]);

  const completedIds = (ordersRes.data || []).map((o) => o.id);

  let topProducts: { name: string; qty: number; revenue: number }[] = [];

  if (completedIds.length > 0) {
    const { data: items } = await supabase
      .from("order_items")
      .select("product_name, quantity, unit_price_nad")
      .in("order_id", completedIds);

    const productMap = new Map<string, { qty: number; revenue: number }>();
    (items || []).forEach((item) => {
      const existing = productMap.get(item.product_name) || { qty: 0, revenue: 0 };
      existing.qty += item.quantity;
      existing.revenue += item.unit_price_nad * item.quantity;
      productMap.set(item.product_name, existing);
    });

    topProducts = Array.from(productMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }

  const allData = (analyticsRes.data || []).map((d) => ({
    date: d.date,
    page_views: d.page_views,
    orders_placed: d.orders_placed,
    orders_confirmed: d.orders_confirmed,
    revenue_nad: d.revenue_nad,
  }));

  return (
    <div className="md:ml-56">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics</h1>
      <AnalyticsClient allData={allData} topProducts={topProducts} />
    </div>
  );
}
