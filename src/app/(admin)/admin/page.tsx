import { createServiceClient } from "@/lib/supabase/service";
import { StatCard } from "@/components/admin/stat-card";
import {
  DollarSign,
  Users,
  UserPlus,
  AlertTriangle,
  Flag,
  Activity,
  ArrowRight,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { TIER_LABELS, STATUS_LABELS, TIER_LIMITS, type SubscriptionTier, type SubscriptionStatus } from "@/lib/tier-limits";

export default async function AdminOverviewPage() {
  const service = createServiceClient();

  const now = new Date();
  const nowMs = now.getTime();
  const oneWeekAgo = new Date(nowMs - 7 * 24 * 60 * 60 * 1000).toISOString();
  const sixMonthsAgo = new Date(nowMs - 180 * 24 * 60 * 60 * 1000).toISOString();
  const oneWeekAhead = new Date(nowMs + 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    subsResult,
    newSignupsResult,
    /* pendingResult — reserved for future pending store count */,
    overdueResult,
    reportsResult,
    paymentsResult,
    signupsResult,
    expiringResult,
    overdueListResult,
    activityResult,
    safetyResult,
    suspendedResult,
  ] = await Promise.all([
    // Active subscriptions + tier for MRR
    service.from("subscriptions").select("tier, status"),
    // New signups this week
    service.from("merchants").select("id", { count: "exact", head: true })
      .gte("created_at", oneWeekAgo),
    // (no longer used — stores go active on signup)
    Promise.resolve({ count: 0 }),
    // Overdue
    service.from("subscriptions").select("id", { count: "exact", head: true })
      .in("status", ["grace", "soft_suspended"]),
    // Open reports
    service.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    // Revenue trend (last 6 months payments)
    service.from("payments").select("amount_nad, created_at").is("voided_at", null)
      .gte("created_at", sixMonthsAgo),
    // Signups trend (last 6 months)
    service.from("merchants").select("created_at")
      .gte("created_at", sixMonthsAgo),
    // Expiring trials (next 7 days)
    service.from("subscriptions").select("merchant_id, trial_ends_at, merchants!inner(store_name)")
      .eq("status", "trial")
      .lte("trial_ends_at", oneWeekAhead)
      .order("trial_ends_at", { ascending: true }).limit(10),
    // Overdue subscriptions
    service.from("subscriptions").select("merchant_id, status, grace_ends_at, soft_suspended_at, tier, merchants!inner(store_name)")
      .in("status", ["grace", "soft_suspended"])
      .order("grace_ends_at", { ascending: true }).limit(10),
    // Recent activity
    service.from("admin_actions").select("*, admin_users(email)")
      .order("created_at", { ascending: false }).limit(20),
    service.from("safety_reviews").select("id", { count: "exact", head: true }).eq("status", "open"),
    service.from("merchants").select("id", { count: "exact", head: true }).in("store_status", ["suspended", "banned"]),
  ]);

  // Calculate MRR from tier prices
  const activeSubs = (subsResult.data || []).filter(
    (s) => s.status === "trial" || s.status === "active" || s.status === "grace"
  );
  const mrr = activeSubs.reduce((sum, s) => sum + (TIER_LIMITS[s.tier as SubscriptionTier]?.price_nad || 0), 0);
  const activeMerchants = activeSubs.length;
  const newSignups = newSignupsResult.count || 0;
  const overdueCount = overdueResult.count || 0;
  const openReports = reportsResult.count || 0;
  const openSafety = safetyResult.count || 0;
  const suspendedStores = suspendedResult.count || 0;
  const riskTotal = overdueCount + openReports + openSafety + suspendedStores;

  return (
    <div>
      <section className="mb-6 overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-white shadow-sm shadow-slate-900/10">
        <div className="relative p-6 sm:p-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(43,94,167,0.4),transparent_30%),radial-gradient(circle_at_88%_18%,rgba(20,153,71,0.28),transparent_28%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">
                Platform command center
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                Admin Dashboard
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Monitor OshiCart growth, merchant health, billing risk, support
                reports, and admin activity from one secure workspace.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <MiniMetric label="Risk" value={riskTotal} />
              <MiniMetric label="New" value={newSignups} />
              <MiniMetric label="Active" value={activeMerchants} />
            </div>
          </div>
        </div>
      </section>

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
          value={newSignups}
          icon={UserPlus}
          href="/admin/merchants"
        />
        <StatCard
          label="Overdue"
          value={overdueCount}
          icon={AlertTriangle}
          highlight={overdueCount > 0}
          href="/admin/billing"
        />
        <StatCard
          label="Open Reports"
          value={openReports}
          icon={Flag}
          highlight={openReports > 0}
          href="/admin/reports"
        />
        <StatCard
          label="Safety Reviews"
          value={openSafety}
          icon={ShieldCheck}
          highlight={openSafety > 0}
          href="/admin/safety"
        />
      </div>

      <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
              Risk command
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-950">
              Items needing attention
            </h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            <RiskLink href="/admin/safety" label="Safety" value={openSafety} />
            <RiskLink href="/admin/reports" label="Reports" value={openReports} />
            <RiskLink href="/admin/billing" label="Overdue" value={overdueCount} />
            <RiskLink href="/admin/merchants?status=suspended" label="Restricted" value={suspendedStores} />
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-4">
        <ControlLink
          href="/admin/merchants"
          icon={Users}
          title="Merchant control"
          text="Search, review, suspend, and inspect store accounts."
        />
        <ControlLink
          href="/admin/billing"
          icon={WalletCards}
          title="Billing operations"
          text="Track trials, overdue stores, and manual payment actions."
        />
        <ControlLink
          href="/admin/reports"
          icon={Flag}
          title="Trust and reports"
          text="Resolve open reports and identify platform risk."
        />
        <ControlLink
          href="/admin/safety"
          icon={ShieldCheck}
          title="Safety reviews"
          text="Review flagged stores and prohibited listings."
        />
        <ControlLink
          href="/admin/audit"
          icon={ShieldCheck}
          title="Audit trail"
          text="Review every sensitive admin action."
        />
      </div>

      {/* Revenue + Signups trends */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
          <h2 className="mb-4 text-lg font-black text-slate-950">Revenue (Last 6 Months)</h2>
          <MonthlyTable data={paymentsResult.data || []} type="revenue" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
          <h2 className="mb-4 text-lg font-black text-slate-950">Signups (Last 6 Months)</h2>
          <MonthlyTable data={signupsResult.data || []} type="signups" />
        </div>
      </div>

      {/* Bottom lists */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Expiring trials */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
          <h2 className="mb-4 text-lg font-black text-slate-950">Expiring Trials</h2>
          {(expiringResult.data || []).length === 0 ? (
            <p className="text-sm text-gray-500">No trials expiring soon</p>
          ) : (
            <ul className="space-y-3">
              {(expiringResult.data || []).map((s: Record<string, unknown>) => {
                const merchant = s.merchants as Record<string, unknown>;
                const daysLeft = Math.max(0, Math.ceil(
                  (new Date(s.trial_ends_at as string).getTime() - nowMs) / (1000 * 60 * 60 * 24)
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
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
          <h2 className="mb-4 text-lg font-black text-slate-950">Overdue</h2>
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
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
          <div className="mb-4 flex items-center gap-2">
            <Activity size={18} className="text-slate-500" />
            <h2 className="text-lg font-black text-slate-950">Recent Activity</h2>
          </div>
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

function RiskLink({ href, label, value }: { href: string; label: string; value: number }) {
  return (
    <Link
      href={href}
      className={`min-w-32 rounded-2xl border px-4 py-3 text-center transition hover:-translate-y-0.5 ${
        value > 0
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-wide">{label}</p>
    </Link>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-20 rounded-2xl border border-white/10 bg-white/10 p-4 text-center backdrop-blur">
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-300">{label}</p>
    </div>
  );
}

function ControlLink({
  href,
  icon: Icon,
  title,
  text,
}: {
  href: string;
  icon: typeof Users;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-900/10"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white">
          <Icon size={20} />
        </span>
        <ArrowRight size={18} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-700" />
      </div>
      <h3 className="mt-4 font-black text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
    </Link>
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
