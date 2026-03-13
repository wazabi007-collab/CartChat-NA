import { createServiceClient } from "@/lib/supabase/service";
import { TIER_LABELS, type SubscriptionTier } from "@/lib/tier-limits";
import { INDUSTRIES_NAMIBIA } from "@/lib/constants";

export default async function AnalyticsPage() {
  const service = createServiceClient();

  const [subsRes, merchantsRes, ordersRes, paymentsRes] = await Promise.all([
    service.from("subscriptions").select("tier, status"),
    service.from("merchants").select("id, store_name, industry, created_at").eq("store_status", "active"),
    service.from("orders").select("merchant_id, subtotal_nad, delivery_fee_nad, discount_nad, payment_method, status, created_at")
      .neq("status", "cancelled"),
    service.from("payments").select("amount_nad, created_at").is("voided_at", null),
  ]);

  const subs = subsRes.data || [];
  const merchants = merchantsRes.data || [];
  const orders = ordersRes.data || [];
  const payments = paymentsRes.data || [];

  // Tier distribution
  const tierCounts: Record<string, number> = {};
  subs.forEach((s) => {
    tierCounts[s.tier] = (tierCounts[s.tier] || 0) + 1;
  });

  // Industry breakdown
  const industryCounts: Record<string, number> = {};
  merchants.forEach((m) => {
    const key = m.industry || "other";
    industryCounts[key] = (industryCounts[key] || 0) + 1;
  });

  // GMV
  const gmv = orders.reduce((sum, o) => sum + (o.subtotal_nad || 0) + (o.delivery_fee_nad || 0) - (o.discount_nad || 0), 0);

  // Payment method breakdown
  const payMethodCounts: Record<string, number> = {};
  orders.forEach((o) => {
    const key = o.payment_method || "eft";
    payMethodCounts[key] = (payMethodCounts[key] || 0) + 1;
  });

  // Top merchants by orders
  const merchantOrderCounts: Record<string, number> = {};
  const merchantRevenue: Record<string, number> = {};
  orders.forEach((o) => {
    merchantOrderCounts[o.merchant_id] = (merchantOrderCounts[o.merchant_id] || 0) + 1;
    merchantRevenue[o.merchant_id] = (merchantRevenue[o.merchant_id] || 0) + (o.subtotal_nad || 0);
  });
  const merchantMap = new Map(merchants.map((m) => [m.id, m.store_name]));

  const topByOrders = Object.entries(merchantOrderCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({ name: merchantMap.get(id) || id, value: count }));

  const topByRevenue = Object.entries(merchantRevenue)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, revenue]) => ({ name: merchantMap.get(id) || id, value: revenue }));

  // Platform revenue (from payments, not GMV)
  const totalPlatformRevenue = payments.reduce((sum, p) => sum + (p.amount_nad || 0), 0);

  const industryLabels = Object.fromEntries(INDUSTRIES_NAMIBIA.map((i) => [i.value, i.label]));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics</h1>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatBox label="Platform GMV" value={`N$${(gmv / 100).toLocaleString()}`} />
        <StatBox label="Platform Revenue" value={`N$${(totalPlatformRevenue / 100).toLocaleString()}`} />
        <StatBox label="Total Orders" value={orders.length.toLocaleString()} />
        <StatBox label="Active Merchants" value={merchants.length.toLocaleString()} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Tier distribution */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Tier Distribution</h2>
          <div className="space-y-3">
            {Object.entries(tierCounts).map(([tier, count]) => {
              const total = subs.length || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={tier}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{TIER_LABELS[tier as SubscriptionTier] || tier}</span>
                    <span className="text-gray-500">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment methods */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Payment Methods</h2>
          <div className="space-y-3">
            {Object.entries(payMethodCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([method, count]) => {
                const total = orders.length || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={method}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize">{method}</span>
                      <span className="text-gray-500">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Industry breakdown */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Industry Breakdown</h2>
          <div className="space-y-2">
            {Object.entries(industryCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([industry, count]) => (
                <div key={industry} className="flex justify-between text-sm">
                  <span>{industryLabels[industry] || industry}</span>
                  <span className="text-gray-500">{count}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Revenue by month */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Revenue by Month</h2>
          <MonthlyBreakdown data={payments} />
        </div>
      </div>

      {/* Top merchants */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-lg p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Top 10 by Orders</h2>
          <ol className="space-y-2">
            {topByOrders.map((m, i) => (
              <li key={m.name} className="flex justify-between text-sm">
                <span><span className="text-gray-400 mr-2">{i + 1}.</span>{m.name}</span>
                <span className="font-medium">{m.value}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Top 10 by Revenue</h2>
          <ol className="space-y-2">
            {topByRevenue.map((m, i) => (
              <li key={m.name} className="flex justify-between text-sm">
                <span><span className="text-gray-400 mr-2">{i + 1}.</span>{m.name}</span>
                <span className="font-medium">N${(m.value / 100).toLocaleString()}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function MonthlyBreakdown({ data }: { data: Record<string, unknown>[] }) {
  const months: Record<string, number> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months[d.toLocaleString("default", { month: "short", year: "2-digit" })] = 0;
  }
  data.forEach((p) => {
    const date = new Date(p.created_at as string);
    const key = date.toLocaleString("default", { month: "short", year: "2-digit" });
    if (key in months) months[key] += (p.amount_nad as number) || 0;
  });

  return (
    <div className="space-y-2">
      {Object.entries(months).map(([month, value]) => (
        <div key={month} className="flex justify-between text-sm">
          <span className="text-gray-600">{month}</span>
          <span className="font-medium">N${(value / 100).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
