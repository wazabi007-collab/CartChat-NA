import Link from "next/link";
import { AlertTriangle, Ban, Search, ShieldAlert, Store, Users } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminPermission } from "@/lib/admin-auth";
import { STORE_STATUS_LABELS } from "@/lib/constants";
import {
  STATUS_LABELS,
  TIER_COLORS,
  TIER_LABELS,
  type SubscriptionStatus,
  type SubscriptionTier,
} from "@/lib/tier-limits";

export default async function MerchantsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; tier?: string; q?: string }>;
}) {
  await requireAdminPermission("view_merchants");
  const { status, tier, q } = await searchParams;
  const service = createServiceClient();

  let query = service
    .from("merchants")
    .select("id, store_name, store_slug, user_id, store_status, created_at, industry, whatsapp_number, is_demo")
    .order("created_at", { ascending: false });

  if (status && ["pending", "active", "suspended", "banned"].includes(status)) {
    query = query.eq("store_status", status);
  }

  const { data: merchants } = await query;
  const merchantIds = (merchants || []).map((merchant) => merchant.id);

  const [subscriptionsRes, orderCountsRes, reportsRes, safetyRes] = merchantIds.length
    ? await Promise.all([
        service
          .from("subscriptions")
          .select("merchant_id, tier, status, trial_ends_at, current_period_end, pending_tier, payment_reference")
          .in("merchant_id", merchantIds),
        service
          .from("orders")
          .select("merchant_id")
          .in("merchant_id", merchantIds)
          .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
          .neq("status", "cancelled"),
        service.from("reports").select("merchant_id").eq("status", "open").in("merchant_id", merchantIds),
        service.from("safety_reviews").select("merchant_id").eq("status", "open").in("merchant_id", merchantIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const subMap = new Map((subscriptionsRes.data || []).map((sub) => [sub.merchant_id, sub]));
  const orderMap = countByMerchant(orderCountsRes.data || []);
  const reportMap = countByMerchant(reportsRes.data || []);
  const safetyMap = countByMerchant(safetyRes.data || []);

  let filtered = (merchants || []).map((merchant) => ({
    ...merchant,
    subscription: subMap.get(merchant.id),
    ordersThisMonth: orderMap.get(merchant.id) || 0,
    openReports: reportMap.get(merchant.id) || 0,
    openSafety: safetyMap.get(merchant.id) || 0,
  }));

  if (tier) {
    filtered = filtered.filter((merchant) => merchant.subscription?.tier === tier);
  }

  if (status && ["trial", "active", "grace", "soft_suspended", "hard_suspended"].includes(status)) {
    filtered = filtered.filter((merchant) => merchant.subscription?.status === status);
  }

  if (q) {
    const term = q.toLowerCase();
    filtered = filtered.filter(
      (merchant) =>
        merchant.store_name?.toLowerCase().includes(term) ||
        merchant.store_slug?.toLowerCase().includes(term) ||
        merchant.whatsapp_number?.includes(term)
    );
  }

  const active = filtered.filter((merchant) => merchant.store_status === "active").length;
  const suspended = filtered.filter((merchant) => merchant.store_status === "suspended").length;
  const banned = filtered.filter((merchant) => merchant.store_status === "banned").length;
  const overdue = filtered.filter((merchant) =>
    ["grace", "soft_suspended", "hard_suspended"].includes(merchant.subscription?.status || "")
  ).length;

  return (
    <div>
      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
              Merchant operations
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Merchants</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Search stores, monitor billing and safety risk, and open a merchant control room.
            </p>
          </div>
          <span className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
            {filtered.length} merchants
          </span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-5">
          <Metric icon={Users} label="Total" value={filtered.length} />
          <Metric icon={Store} label="Active" value={active} tone="green" />
          <Metric icon={AlertTriangle} label="Overdue" value={overdue} tone="amber" />
          <Metric icon={ShieldAlert} label="Suspended" value={suspended} tone="red" />
          <Metric icon={Ban} label="Banned" value={banned} />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-900/5">
        <FilterLink href="/admin/merchants" active={!status && !tier} label="All" />
        <FilterLink href="/admin/merchants?status=trial" active={status === "trial"} label="Trial" />
        <FilterLink href="/admin/merchants?status=active" active={status === "active"} label="Active" />
        <FilterLink href="/admin/merchants?status=grace" active={status === "grace"} label="Grace" />
        <FilterLink href="/admin/merchants?status=soft_suspended" active={status === "soft_suspended"} label="Billing suspended" />
        <FilterLink href="/admin/merchants?status=suspended" active={status === "suspended"} label="Store suspended" />
        <FilterLink href="/admin/merchants?status=banned" active={status === "banned"} label="Banned" />
      </div>

      <form action="/admin/merchants" method="GET" className="relative mb-6 max-w-xl">
        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        {status && <input type="hidden" name="status" value={status} />}
        {tier && <input type="hidden" name="tier" value={tier} />}
        <input
          name="q"
          type="text"
          placeholder="Search by name, slug, or WhatsApp..."
          defaultValue={q}
          className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        />
      </form>

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-5 py-4 font-black">Store</th>
              <th className="px-5 py-4 font-black">Plan</th>
              <th className="px-5 py-4 font-black">Status</th>
              <th className="px-5 py-4 font-black">Risk</th>
              <th className="px-5 py-4 text-right font-black">Orders/mo</th>
              <th className="px-5 py-4 font-black">Sub Ends</th>
              <th className="px-5 py-4 font-black">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((merchant) => {
              const sub = merchant.subscription;
              const tierLabel = sub ? TIER_LABELS[sub.tier as SubscriptionTier] : "No plan";
              const tierColor = sub ? TIER_COLORS[sub.tier as SubscriptionTier] : "bg-slate-100 text-slate-600";
              const subStatus = sub ? STATUS_LABELS[sub.status as SubscriptionStatus] : null;
              const storeStatus = STORE_STATUS_LABELS[merchant.store_status] || {
                label: merchant.store_status,
                color: "bg-gray-100 text-gray-800",
              };
              const endDate = sub?.current_period_end || sub?.trial_ends_at;
              const hasBillingRisk = ["grace", "soft_suspended", "hard_suspended"].includes(sub?.status || "");
              return (
                <tr key={merchant.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <Link href={`/admin/merchants/${merchant.id}`} className="font-black text-slate-950 hover:text-emerald-700">
                      {merchant.store_name}
                    </Link>
                    {merchant.is_demo && (
                      <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-black text-violet-800">
                        DEMO
                      </span>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span>{merchant.store_slug}</span>
                      <Link href={`/s/${merchant.store_slug}`} target="_blank" className="font-bold text-blue-600 hover:underline">
                        View store
                      </Link>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-black ${tierColor}`}>{tierLabel}</span>
                    {sub?.pending_tier && sub.pending_tier !== sub.tier && (
                      <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-800">
                        to {TIER_LABELS[sub.pending_tier as SubscriptionTier] || sub.pending_tier}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-black ${storeStatus.color}`}>{storeStatus.label}</span>
                    {subStatus && (
                      <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-black ${subStatus.color}`}>{subStatus.label}</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {merchant.openSafety > 0 && <RiskBadge tone="red" label={`${merchant.openSafety} safety`} />}
                      {merchant.openReports > 0 && <RiskBadge tone="amber" label={`${merchant.openReports} report`} />}
                      {hasBillingRisk && <RiskBadge tone="red" label="billing" />}
                      {merchant.openSafety === 0 && merchant.openReports === 0 && !hasBillingRisk && (
                        <RiskBadge tone="green" label="clear" />
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right font-bold">{merchant.ordersThisMonth}</td>
                  <td className="px-5 py-4 text-xs text-slate-500">
                    {endDate ? new Date(endDate).toLocaleDateString() : "none"}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500">
                    {new Date(merchant.created_at).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  No merchants found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function countByMerchant(rows: Array<{ merchant_id: string }>) {
  const counts = new Map<string, number>();
  rows.forEach((row) => counts.set(row.merchant_id, (counts.get(row.merchant_id) || 0) + 1));
  return counts;
}

function FilterLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1.5 text-sm font-bold transition-colors ${
        active
          ? "border-slate-950 bg-slate-950 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label}
    </Link>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone = "slate",
}: {
  icon: typeof Users;
  label: string;
  value: number;
  tone?: "slate" | "green" | "amber" | "red";
}) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-950",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-red-200 bg-red-50 text-red-700",
  };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide opacity-70">
        <Icon size={14} />
        {label}
      </div>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function RiskBadge({ label, tone }: { label: string; tone: "green" | "amber" | "red" }) {
  const tones = {
    green: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-800",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-black ${tones[tone]}`}>{label}</span>;
}
