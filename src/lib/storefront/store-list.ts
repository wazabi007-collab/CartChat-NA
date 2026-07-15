import type { SupabaseClient } from "@supabase/supabase-js";

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
 * search / category), enriched with product counts and up to 4 preview
 * images each. Shared by /stores (full browse) and /stores/[region]
 * (SEO landing pages) so both stay in sync.
 */
export async function fetchStoreListData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  { region, q, category }: { region?: string; q?: string; category?: string }
): Promise<EnrichedStore[]> {
  let query = supabase
    .from("merchants")
    .select("id, store_name, store_slug, description, logo_url, whatsapp_number, industry, region, town, created_at")
    .eq("is_active", true)
    .eq("store_status", "active")
    .order("created_at", { ascending: false });

  if (q && q.trim()) {
    query = query.or(`store_name.ilike.%${q.trim()}%,description.ilike.%${q.trim()}%`);
  }

  if (region && region !== "all") {
    query = query.eq("region", region);
  }

  const { data: merchants } = await query;
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
    const { data: previews } = await supabase
      .from("products")
      .select("merchant_id, image_url")
      .in("merchant_id", merchantIds)
      .eq("is_available", true)
      .is("deleted_at", null)
      .not("image_url", "is", null)
      .order("created_at", { ascending: false });
    for (const p of previews ?? []) {
      if (!p.image_url) continue;
      const existing = previewMap.get(p.merchant_id) ?? [];
      if (existing.length < 4) {
        existing.push(p.image_url);
        previewMap.set(p.merchant_id, existing);
      }
    }
  }

  return publicStoreList.map((merchant) => ({
    ...merchant,
    productCount: countMap.get(merchant.id) || 0,
    previewImages: previewMap.get(merchant.id) ?? [],
  }));
}
