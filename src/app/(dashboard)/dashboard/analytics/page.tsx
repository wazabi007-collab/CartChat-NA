import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AnalyticsClient } from "@/components/dashboard/analytics-client";
import { BarChart3, MousePointerClick, ShoppingBag } from "lucide-react";

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
      .select("product_name, quantity, line_total")
      .in("order_id", completedIds);

    const productMap = new Map<string, { qty: number; revenue: number }>();
    (items || []).forEach((item) => {
      const existing = productMap.get(item.product_name) || { qty: 0, revenue: 0 };
      existing.qty += item.quantity;
      existing.revenue += item.line_total;
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

  const last30 = allData.filter((day) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return day.date >= cutoff.toISOString().split("T")[0];
  });
  const views30 = last30.reduce((sum, day) => sum + day.page_views, 0);
  const orders30 = last30.reduce((sum, day) => sum + day.orders_placed, 0);

  return (
    <div className="md:ml-56">
      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-acacia">
            Store performance
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Analytics
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            See what customers view, which products convert, and where your
            next marketing push should focus.
          </p>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              <BarChart3 size={14} />
              Data rows
            </div>
            <p className="mt-2 text-2xl font-black text-slate-950">{allData.length}</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-700">
              <MousePointerClick size={14} />
              30d views
            </div>
            <p className="mt-2 text-2xl font-black text-blue-700">{views30}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-700">
              <ShoppingBag size={14} />
              30d orders
            </div>
            <p className="mt-2 text-2xl font-black text-emerald-700">{orders30}</p>
          </div>
        </div>
      </div>
      <AnalyticsClient allData={allData} topProducts={topProducts} />
    </div>
  );
}
