import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { hasPriorityPlacement } from "@/lib/tier-limits";

export const INDUSTRY_LABELS: Record<string, string> = {
  restaurant: "Restaurants & Takeaways",
  takeaway: "Restaurants & Takeaways",
  cafe: "Restaurants & Takeaways",
  bakery: "Restaurants & Takeaways",
  catering: "Restaurants & Takeaways",
  grocery: "Grocery & Fresh",
  butchery: "Grocery & Fresh",
  liquor: "Grocery & Fresh",
  agriculture: "Grocery & Fresh",
  fashion: "Fashion & Retail",
  electronics: "Electronics & Tech",
  hardware: "Hardware & Auto",
  auto_parts: "Hardware & Auto",
  salon: "Beauty & Wellness",
  cosmetics: "Beauty & Wellness",
  pharmacy: "Beauty & Wellness",
  cleaning: "Services",
  printing: "Services",
  services: "Services",
  gas_water: "Services",
  flowers: "Gifting & Lifestyle",
  pet: "Gifting & Lifestyle",
  furniture: "Home & Furniture",
  stationery: "General & Other",
  sports: "General & Other",
  toys: "General & Other",
  crafts: "General & Other",
  general_dealer: "General & Other",
  other: "General & Other",
};

export const CATEGORY_ORDER = [
  "All",
  "Electronics & Tech",
  "Restaurants & Takeaways",
  "Fashion & Retail",
  "Beauty & Wellness",
  "Grocery & Fresh",
  "Home & Furniture",
  "Hardware & Auto",
  "Services",
  "Gifting & Lifestyle",
  "General & Other",
];

export interface StoreListMerchant {
  id: string;
  store_name: string;
  store_slug: string;
  description: string | null;
  logo_url: string | null;
  whatsapp_number: string;
  industry: string | null;
  region: string | null;
  town: string | null;
  created_at: string;
}

export interface EnrichedStore extends StoreListMerchant {
  productCount: number;
  previewImages: string[];
}

/**
 * Fetches active, publicly-listable stores (optionally filtered by region /
 * town / search / category), enriched with product counts and up to 4 preview
 * images each. Shared by /stores (full browse) and /stores/[region]
 * (SEO landing pages) so both stay in sync.
 *
 * `town` is applied as given — callers own the check that it belongs to
 * `region`, since a mismatched pair silently returns nothing.
 */
export async function fetchStoreListData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  { region, q, category, town }: { region?: string; q?: string; category?: string; town?: string }
): Promise<EnrichedStore[]> {
  let query = supabase
    .from("merchants")
    .select("id, store_name, store_slug, description, logo_url, whatsapp_number, industry, region, town, created_at")
    .eq("is_active", true)
    .eq("store_status", "active")
    // A practice store is not a business a shopper should be able to order
    // from, so it stays out of the marketplace listing.
    .eq("is_demo", false)
    .order("created_at", { ascending: false });

  if (q && q.trim()) {
    query = query.or(`store_name.ilike.%${q.trim()}%,description.ilike.%${q.trim()}%`);
  }

  if (region && region !== "all") {
    query = query.eq("region", region);
  }

  if (town && town !== "all") {
    query = query.eq("town", town);
  }

  const { data: merchants, error: listError } = await query;
  // Swallowing this turned a denied column into an empty marketplace: the page
  // rendered "No stores yet" to every shopper, and nothing anywhere said why.
  // An empty list is a real answer; a failed query is not.
  if (listError) {
    throw new Error(`Could not load the store list: ${listError.message}`);
  }
  let storeList: StoreListMerchant[] = merchants || [];

  if (category && category !== "All") {
    storeList = storeList.filter((m) => {
      const label = INDUSTRY_LABELS[m.industry || "other"] || "General & Other";
      return label === category;
    });
  }

  const countMap = new Map<string, number>();
  if (storeList.length > 0) {
    const countPromises = storeList.map(async (m) => {
      const { count } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("merchant_id", m.id)
        .eq("is_available", true)
        .is("deleted_at", null);
      return { id: m.id, count: count || 0 };
    });
    const counts = await Promise.all(countPromises);
    for (const c of counts) countMap.set(c.id, c.count);
  }

  const publicStoreList = storeList.filter((merchant) => {
    const productCount = countMap.get(merchant.id) || 0;
    const normalizedName = merchant.store_name.toLowerCase();
    const normalizedDescription = (merchant.description || "").toLowerCase();
    const isInternalDemo =
      normalizedName.includes("test") ||
      normalizedName.includes("demo") ||
      normalizedDescription.includes("demonstration store");
    return productCount > 0 && !isInternalDemo;
  });

  const merchantIds = publicStoreList.map((m) => m.id);
  const previewMap = new Map<string, string[]>();
  if (merchantIds.length > 0) {
    // Ranked per merchant in the database (migration 060). Selecting products
    // for every store in one flat query hit PostgREST's 1000-row cap: a single
    // large catalogue consumed 991 slots with un-photographed products, so the
    // biggest stores showed no thumbnails while a 4-product store showed four.
    const { data: previews } = await supabase.rpc("get_store_preview_images", {
      p_merchant_ids: merchantIds,
    });
    for (const p of (previews ?? []) as {
      merchant_id: string;
      image: string;
    }[]) {
      if (!p.image) continue;
      const existing = previewMap.get(p.merchant_id) ?? [];
      existing.push(p.image);
      previewMap.set(p.merchant_id, existing);
    }
  }

  // Paid stores list above free stores — the visibility Oshi-Storefront buys.
  // Subscriptions are not anon-readable (billing data), so the tier lookup
  // uses the service client; only the resulting ORDER reaches the page, never
  // any subscription detail. Grace counts (they have paid); trials of a paid
  // tier count too — the boost is part of what the trial demonstrates.
  const prioritised = new Set<string>();
  if (merchantIds.length > 0) {
    const { data: subs } = await createServiceClient()
      .from("subscriptions")
      .select("merchant_id, tier, status")
      .in("merchant_id", merchantIds)
      .in("status", ["active", "trial", "grace"]);
    for (const sub of subs ?? []) {
      if (hasPriorityPlacement(sub.tier)) prioritised.add(sub.merchant_id);
    }
  }

  const enriched = publicStoreList.map((merchant) => ({
    ...merchant,
    productCount: countMap.get(merchant.id) || 0,
    previewImages: previewMap.get(merchant.id) ?? [],
  }));

  // Stable sort: two bands, newest-first preserved within each.
  return enriched.sort(
    (a, b) => Number(prioritised.has(b.id)) - Number(prioritised.has(a.id))
  );
}
