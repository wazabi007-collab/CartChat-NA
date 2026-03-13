import { createServiceClient } from "@/lib/supabase/service";
import { STORE_STATUS_LABELS } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import { StoreActions } from "./store-actions";

export default async function AdminStoresPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const supabase = createServiceClient();

  let query = supabase
    .from("merchants")
    .select("id, store_name, store_slug, whatsapp_number, store_status, tier, created_at, user_id")
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("store_status", status);
  }

  if (q && q.trim()) {
    query = query.or(
      `store_name.ilike.%${q.trim()}%,store_slug.ilike.%${q.trim()}%`
    );
  }

  const { data: merchants } = await query;
  const storeList = merchants || [];

  // Get order counts per merchant
  const merchantIds = storeList.map((m) => m.id);
  const { data: orderData } = merchantIds.length > 0
    ? await supabase
        .from("orders")
        .select("merchant_id, subtotal_nad")
        .in("merchant_id", merchantIds)
    : { data: [] };

  const orderCountMap = new Map<string, number>();
  const revenueMap = new Map<string, number>();
  for (const o of orderData || []) {
    orderCountMap.set(o.merchant_id, (orderCountMap.get(o.merchant_id) || 0) + 1);
    revenueMap.set(o.merchant_id, (revenueMap.get(o.merchant_id) || 0) + o.subtotal_nad);
  }

  // Get report counts per merchant
  const { data: reportData } = merchantIds.length > 0
    ? await supabase
        .from("reports")
        .select("merchant_id")
        .in("merchant_id", merchantIds)
        .eq("status", "open")
    : { data: [] };

  const reportCountMap = new Map<string, number>();
  for (const r of reportData || []) {
    reportCountMap.set(r.merchant_id, (reportCountMap.get(r.merchant_id) || 0) + 1);
  }

  const statusFilters = ["all", "pending", "active", "suspended", "banned"];

  return (
    <div className="md:ml-56">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Manage Stores</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4 mb-6 space-y-3">
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((s) => (
            <a
              key={s}
              href={`/admin/stores?status=${s}${q ? `&q=${q}` : ""}`}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                (status || "all") === s
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s === "all" ? "All" : STORE_STATUS_LABELS[s]?.label || s}
            </a>
          ))}
        </div>
        <form action="/admin/stores" method="GET" className="flex gap-2">
          <input type="hidden" name="status" value={status || "all"} />
          <input
            type="text"
            name="q"
            defaultValue={q || ""}
            placeholder="Search store name..."
            className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800"
          >
            Search
          </button>
        </form>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 mb-4">{storeList.length} store{storeList.length !== 1 ? "s" : ""}</p>

      {/* Store list */}
      <div className="space-y-3">
        {storeList.length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
            No stores found matching your filters.
          </div>
        ) : (
          storeList.map((merchant) => {
            const statusInfo = STORE_STATUS_LABELS[merchant.store_status] || { label: merchant.store_status, color: "bg-gray-100 text-gray-800" };
            const orders = orderCountMap.get(merchant.id) || 0;
            const revenue = revenueMap.get(merchant.id) || 0;
            const reports = reportCountMap.get(merchant.id) || 0;
            const daysSinceCreation = Math.floor(
              (Date.now() - new Date(merchant.created_at).getTime()) / (1000 * 60 * 60 * 24)
            );

            return (
              <div key={merchant.id} className="bg-white rounded-lg border p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{merchant.store_name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      <span className="text-xs text-gray-400">{merchant.tier}</span>
                      {reports > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                          {reports} report{reports > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                      <span>/s/{merchant.store_slug}</span>
                      <span>{merchant.whatsapp_number}</span>
                      <span>{daysSinceCreation}d ago</span>
                      <span>{orders} orders</span>
                      <span>{formatPrice(revenue)} revenue</span>
                    </div>
                  </div>
                  <StoreActions
                    merchantId={merchant.id}
                    currentStatus={merchant.store_status}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
