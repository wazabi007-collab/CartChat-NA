import { createServiceClient } from "@/lib/supabase/service";
import { TIER_LABELS, TIER_COLORS, STATUS_LABELS, type SubscriptionTier, type SubscriptionStatus } from "@/lib/tier-limits";
import { STORE_STATUS_LABELS } from "@/lib/constants";
import Link from "next/link";

export default async function MerchantsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; tier?: string; q?: string }>;
}) {
  const { status, tier, q } = await searchParams;
  const service = createServiceClient();

  // Fetch merchants with subscriptions
  let query = service
    .from("merchants")
    .select("id, store_name, slug, user_id, store_status, created_at, industry, whatsapp_number")
    .order("created_at", { ascending: false });

  if (status && ["pending", "active", "suspended", "banned"].includes(status)) {
    query = query.eq("store_status", status);
  }

  const { data: merchants } = await query;

  // Fetch all subscriptions
  const merchantIds = (merchants || []).map((m) => m.id);
  const { data: subscriptions } = merchantIds.length > 0
    ? await service.from("subscriptions").select("merchant_id, tier, status, trial_ends_at, current_period_end").in("merchant_id", merchantIds)
    : { data: [] };

  // Fetch order counts this month
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const { data: orderCounts } = merchantIds.length > 0
    ? await service.from("orders").select("merchant_id").in("merchant_id", merchantIds).gte("created_at", monthStart).neq("status", "cancelled")
    : { data: [] };

  const subMap = new Map((subscriptions || []).map((s) => [s.merchant_id, s]));
  const orderMap = new Map<string, number>();
  (orderCounts || []).forEach((o) => {
    orderMap.set(o.merchant_id, (orderMap.get(o.merchant_id) || 0) + 1);
  });

  let filtered = (merchants || []).map((m) => ({
    ...m,
    subscription: subMap.get(m.id),
    ordersThisMonth: orderMap.get(m.id) || 0,
  }));

  // Filter by tier
  if (tier) {
    filtered = filtered.filter((m) => m.subscription?.tier === tier);
  }

  // Filter by subscription status
  if (status && ["trial", "active", "grace", "soft_suspended", "hard_suspended"].includes(status)) {
    filtered = filtered.filter((m) => m.subscription?.status === status);
  }

  // Search
  if (q) {
    const query = q.toLowerCase();
    filtered = filtered.filter(
      (m) =>
        m.store_name?.toLowerCase().includes(query) ||
        m.slug?.toLowerCase().includes(query) ||
        m.whatsapp_number?.includes(query)
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Merchants</h1>
        <span className="text-sm text-gray-500">{filtered.length} merchants</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <FilterLink href="/admin/merchants" active={!status && !tier} label="All" />
        <FilterLink href="/admin/merchants?status=trial" active={status === "trial"} label="Trial" />
        <FilterLink href="/admin/merchants?status=active" active={status === "active"} label="Active" />
        <FilterLink href="/admin/merchants?status=grace" active={status === "grace"} label="Grace" />
        <FilterLink href="/admin/merchants?status=soft_suspended" active={status === "soft_suspended"} label="Suspended" />
        <FilterLink href="/admin/merchants?status=pending" active={status === "pending"} label="Pending" />
      </div>

      {/* Search */}
      <form className="mb-6">
        <input
          name="q"
          type="text"
          placeholder="Search by name, slug, or WhatsApp..."
          defaultValue={q}
          className="w-full max-w-md px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </form>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Store</th>
              <th className="px-4 py-3 font-medium">Tier</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Sub Status</th>
              <th className="px-4 py-3 font-medium text-right">Orders/mo</th>
              <th className="px-4 py-3 font-medium">Sub Ends</th>
              <th className="px-4 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((m) => {
              const sub = m.subscription;
              const tierLabel = sub ? TIER_LABELS[sub.tier as SubscriptionTier] : "—";
              const tierColor = sub ? TIER_COLORS[sub.tier as SubscriptionTier] : "";
              const subStatus = sub ? STATUS_LABELS[sub.status as SubscriptionStatus] : null;
              const storeStatus = STORE_STATUS_LABELS[m.store_status] || { label: m.store_status, color: "bg-gray-100 text-gray-800" };
              const endDate = sub?.current_period_end || sub?.trial_ends_at;

              return (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/merchants/${m.id}`} className="text-blue-600 hover:underline font-medium">
                      {m.store_name}
                    </Link>
                    <p className="text-xs text-gray-400">{m.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${tierColor}`}>{tierLabel}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${storeStatus.color}`}>{storeStatus.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    {subStatus && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${subStatus.color}`}>{subStatus.label}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">{m.ordersThisMonth}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {endDate ? new Date(endDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No merchants found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
        active ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
      }`}
    >
      {label}
    </Link>
  );
}
