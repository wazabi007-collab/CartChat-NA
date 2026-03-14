import { createServiceClient } from "@/lib/supabase/service";
import { StatCard } from "@/components/admin/stat-card";
import {
  DollarSign,
  Users,
  UserPlus,
  AlertTriangle,
  Flag,
} from "lucide-react";
import Link from "next/link";
import { TIER_LABELS, STATUS_LABELS, type SubscriptionTier, type SubscriptionStatus } from "@/lib/tier-limits";

export default async function AdminOverviewPage() {
  const service = createServiceClient();

  const [
    subsResult,
    newSignupsResult,
    pendingResult,
    overdueResult,
    reportsResult,
    paymentsResult,
    signupsResult,
    expiringResult,
    overdueListResult,
    activityResult,
  ] = await Promise.all([
    // Active subscriptions + tier for MRR
    service.from("subscriptions").select("tier, status"),
    // New signups this week
    service.from("merchants").select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    // (no longer used — stores go active on signup)
    Promise.resolve({ count: 0 }),
    // Overdue
    service.from("subscriptions").select("id", { count: "exact", head: true })
      .in("status", ["grace", "soft_suspended"]),
    // Open reports
    service.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    // Revenue trend (last 6 months payments)
    service.from("payments").select("amount_nad, created_at").is("voided_at", null)
      .gte("created_at", new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()),
    // Signups trend (last 6 months)
    service.from("merchants").select("created_at")
      .gte("created_at", new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()),
    // Expiring trials (next 7 days)
    service.from("subscriptions").select("merchant_id, trial_ends_at, merchants!inner(store_name)")
      .eq("status", "trial")
      .lte("trial_ends_at", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
      .order("trial_ends_at", { ascending: true }).limit(10),
    // Overdue subscriptions
    service.from("subscriptions").select("merchant_id, status, grace_ends_at, soft_suspended_at, tier, merchants!inner(store_name)")
      .in("status", ["grace", "soft_suspended"])
      .order("grace_ends_at", { ascending: true }).limit(10),
    // Recent activity
    service.from("admin_actions").select("*, admin_users(email)")
      .order("created_at", { ascending: false }).limit(20),
  ]);

  // Calculate MRR from tier prices
  const TIER_PRICES: Record<string, number> = {
    oshi_start: 0, oshi_basic: 19900, oshi_grow: 49900, oshi_pro: 120000,
  };
  const activeSubs = (subsResult.data || []).filter(
    (s) => s.status === "trial" || s.status === "active" || s.status === "grace"
  );
  const mrr = activeSubs.reduce((sum, s) => sum + (TIER_PRICES[s.tier] || 0), 0);
  const activeMerchants = activeSubs.length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard
          label="MRR"
          value={`N$${(mrr / 100).toLocaleString()}`}
          icon={DollarSign}
          href="/admin/billing"
        />
        <StatCard
          label="Active Merchants"
          value={activeMerchants}
          icon={Users}
          href="/admin/merchants"
        />
        <StatCard
          label="New This Week"
          value={newSignupsResult.count || 0}
          icon={UserPlus}
          href="/admin/merchants"
        />
        <StatCard
          label="Overdue"
          value={overdueResult.count || 0}
          icon={AlertTriangle}
          highlight={(overdueResult.count || 0) > 0}
          href="/admin/billing"
        />
        <StatCard
          label="Open Reports"
          value={reportsResult.count || 0}
          icon={Flag}
          highlight={(reportsResult.count || 0) > 0}
          href="/admin/reports"
        />
      </div>

      {/* Revenue + Signups trends */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue (Last 6 Months)</h2>
          <MonthlyTable data={paymentsResult.data || []} type="revenue" />
        </div>
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Signups (Last 6 Months)</h2>
          <MonthlyTable data={signupsResult.data || []} type="signups" />
        </div>
      </div>

      {/* Bottom lists */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Expiring trials */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Expiring Trials</h2>
          {(expiringResult.data || []).length === 0 ? (
            <p className="text-sm text-gray-500">No trials expiring soon</p>
          ) : (
            <ul className="space-y-3">
              {(expiringResult.data || []).map((s: Record<string, unknown>) => {
                const merchant = s.merchants as Record<string, unknown>;
                const daysLeft = Math.max(0, Math.ceil(
                  (new Date(s.trial_ends_at as string).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                ));
                return (
                  <li key={s.merchant_id as string} className="flex items-center justify-between text-sm">
                    <Link href={`/admin/merchants/${s.merchant_id}`} className="text-blue-600 hover:underline truncate">
                      {merchant?.store_name as string}
                    </Link>
                    <span className={`font-medium ${daysLeft <= 3 ? "text-red-600" : "text-yellow-600"}`}>
                      {daysLeft}d left
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Overdue subscriptions */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Overdue</h2>
          {(overdueListResult.data || []).length === 0 ? (
            <p className="text-sm text-gray-500">No overdue subscriptions</p>
          ) : (
            <ul className="space-y-3">
              {(overdueListResult.data || []).map((s: Record<string, unknown>) => {
                const merchant = s.merchants as Record<string, unknown>;
                const statusInfo = STATUS_LABELS[s.status as SubscriptionStatus];
                return (
                  <li key={s.merchant_id as string} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <Link href={`/admin/merchants/${s.merchant_id}`} className="text-blue-600 hover:underline truncate block">
                        {merchant?.store_name as string}
                      </Link>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo?.color}`}>
                        {statusInfo?.label}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {TIER_LABELS[s.tier as SubscriptionTier]}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          {(activityResult.data || []).length === 0 ? (
            <p className="text-sm text-gray-500">No recent activity</p>
          ) : (
            <ul className="space-y-3">
              {(activityResult.data || []).slice(0, 10).map((a: Record<string, unknown>) => {
                const adminInfo = a.admin_users as Record<string, unknown> | null;
                return (
                  <li key={a.id as string} className="text-sm">
                    <span className="font-medium">{String(adminInfo?.email || "System")}</span>{" "}
                    <span className="text-gray-600">{(a.action as string).replace(/_/g, " ")}</span>
                    <p className="text-xs text-gray-400">
                      {new Date(a.created_at as string).toLocaleString()}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function MonthlyTable({ data, type }: { data: Record<string, unknown>[]; type: "revenue" | "signups" }) {
  const months: Record<string, number> = {};
  const now = new Date();

  // Initialize last 6 months
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
    months[key] = 0;
  }

  data.forEach((item) => {
    const date = new Date(item.created_at as string);
    const key = date.toLocaleString("default", { month: "short", year: "2-digit" });
    if (key in months) {
      months[key] += type === "revenue" ? (item.amount_nad as number) || 0 : 1;
    }
  });

  return (
    <div className="space-y-2">
      {Object.entries(months).map(([month, value]) => (
        <div key={month} className="flex items-center justify-between text-sm">
          <span className="text-gray-600">{month}</span>
          <span className="font-medium">
            {type === "revenue" ? `N$${(value / 100).toLocaleString()}` : value}
          </span>
        </div>
      ))}
    </div>
  );
}
