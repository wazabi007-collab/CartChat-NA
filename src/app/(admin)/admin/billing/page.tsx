import { createServiceClient } from "@/lib/supabase/service";
import { StatCard } from "@/components/admin/stat-card";
import { DollarSign, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { TIER_LABELS, STATUS_LABELS, type SubscriptionTier, type SubscriptionStatus } from "@/lib/tier-limits";
import Link from "next/link";
import { RecordPaymentModal } from "./record-payment-modal";

export default async function BillingPage() {
  const service = createServiceClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [subsRes, paymentsRes, thisMonthRes, overdueRes, expiringRes, merchantsRes] = await Promise.all([
    // Active subs for MRR
    service.from("subscriptions").select("tier, status")
      .in("status", ["trial", "active", "grace"]),
    // All payments
    service.from("payments").select("*, merchants!inner(store_name)")
      .is("voided_at", null).order("created_at", { ascending: false }).limit(100),
    // This month revenue
    service.from("payments").select("amount_nad")
      .is("voided_at", null).gte("created_at", monthStart),
    // Overdue
    service.from("subscriptions").select("merchant_id, status, tier, grace_ends_at, soft_suspended_at, merchants!inner(store_name)")
      .in("status", ["grace", "soft_suspended"])
      .order("grace_ends_at", { ascending: true }),
    // Expiring in 14 days
    service.from("subscriptions").select("merchant_id, status, tier, trial_ends_at, current_period_end, merchants!inner(store_name)")
      .in("status", ["trial", "active"])
      .or(`trial_ends_at.lte.${new Date(Date.now() + 14 * 86400000).toISOString()},current_period_end.lte.${new Date(Date.now() + 14 * 86400000).toISOString()}`)
      .limit(20),
    // Merchants for dropdown
    service.from("merchants").select("id, store_name").eq("store_status", "active").order("store_name"),
  ]);

  const TIER_PRICES: Record<string, number> = {
    oshi_start: 0, oshi_basic: 19900, oshi_grow: 49900, oshi_pro: 120000,
  };
  const mrr = (subsRes.data || []).reduce((sum, s) => sum + (TIER_PRICES[s.tier] || 0), 0);
  const totalRevenue = (paymentsRes.data || []).reduce((sum, p) => sum + (p.amount_nad || 0), 0);
  const collectedThisMonth = (thisMonthRes.data || []).reduce((sum, p) => sum + (p.amount_nad || 0), 0);
  const overdueCount = overdueRes.data?.length || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <RecordPaymentModal merchants={merchantsRes.data || []} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="MRR" value={`N$${(mrr / 100).toLocaleString()}`} icon={TrendingUp} />
        <StatCard label="Total Revenue" value={`N$${(totalRevenue / 100).toLocaleString()}`} icon={DollarSign} />
        <StatCard label="Overdue" value={overdueCount} icon={AlertTriangle} highlight={overdueCount > 0} />
        <StatCard label="Collected This Month" value={`N$${(collectedThisMonth / 100).toLocaleString()}`} icon={CheckCircle} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Overdue list */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Overdue</h2>
          {(overdueRes.data || []).length === 0 ? (
            <p className="text-sm text-gray-500">None</p>
          ) : (
            <ul className="space-y-3">
              {(overdueRes.data || []).map((s: Record<string, unknown>) => {
                const merchant = s.merchants as Record<string, unknown>;
                return (
                  <li key={s.merchant_id as string} className="flex items-center justify-between text-sm">
                    <Link href={`/admin/merchants/${s.merchant_id}`} className="text-blue-600 hover:underline truncate">
                      {merchant?.store_name as string}
                    </Link>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_LABELS[s.status as SubscriptionStatus]?.color}`}>
                      {STATUS_LABELS[s.status as SubscriptionStatus]?.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Expiring soon */}
        <div className="bg-white border rounded-lg p-6 lg:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-4">Expiring in 14 Days</h2>
          {(expiringRes.data || []).length === 0 ? (
            <p className="text-sm text-gray-500">None</p>
          ) : (
            <ul className="space-y-2">
              {(expiringRes.data || []).map((s: Record<string, unknown>) => {
                const merchant = s.merchants as Record<string, unknown>;
                const endDate = (s.current_period_end || s.trial_ends_at) as string;
                return (
                  <li key={s.merchant_id as string} className="flex items-center justify-between text-sm">
                    <Link href={`/admin/merchants/${s.merchant_id}`} className="text-blue-600 hover:underline">
                      {merchant?.store_name as string}
                    </Link>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{TIER_LABELS[s.tier as SubscriptionTier]}</span>
                      <span className="text-xs text-gray-400">{endDate ? new Date(endDate).toLocaleDateString() : "—"}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Payments table */}
      <div className="bg-white border rounded-lg overflow-x-auto">
        <h2 className="font-semibold text-gray-900 p-6 pb-0">Recent Payments</h2>
        <table className="w-full text-sm mt-4">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Merchant</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Amount</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Method</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Reference</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Period</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(paymentsRes.data || []).map((p: Record<string, unknown>) => {
              const merchant = p.merchants as Record<string, unknown>;
              return (
                <tr key={p.id as string}>
                  <td className="px-4 py-3">{merchant?.store_name as string}</td>
                  <td className="px-4 py-3 text-right font-medium">N${((p.amount_nad as number) / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 capitalize">{p.payment_method as string}</td>
                  <td className="px-4 py-3 text-gray-500">{(p.reference as string) || "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {p.period_start as string} — {p.period_end as string}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(p.created_at as string).toLocaleDateString()}</td>
                </tr>
              );
            })}
            {(paymentsRes.data || []).length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No payments recorded yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
