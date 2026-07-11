import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Store, Search, ArrowRight, MessageCircle, ShieldCheck, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SITE_NAME, NAMIBIA_REGIONS, TOWN_LABELS } from "@/lib/constants";
import { PublicNavbar } from "@/components/public-navbar";
import { StoreThumbGrid } from "@/components/storefront/store-thumb-grid";

export const metadata: Metadata = {
  title: `Browse Stores | ${SITE_NAME}`,
  description:
    "Discover Namibian businesses on OshiCart. Browse stores, shop products, and order via WhatsApp. Find restaurants, boutiques, and services near you.",
  alternates: { canonical: "/stores" },
};

const INDUSTRY_LABELS: Record<string, string> = {
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

const CATEGORY_ORDER = [
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

export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; region?: string }>;
}) {
  const { q, category, region } = await searchParams;
  const supabase = await createClient();

  // Fetch all active merchants with their product count
  let query = supabase
    .from("merchants")
    .select("id, store_name, store_slug, description, logo_url, whatsapp_number, industry, region, town, created_at")
    .eq("is_active", true)
    .eq("store_status", "active")
    .order("created_at", { ascending: false });

  if (q && q.trim()) {
    query = query.or(
      `store_name.ilike.%${q.trim()}%,description.ilike.%${q.trim()}%`
    );
  }

  if (region && region !== "all") {
    query = query.eq("region", region);
  }

  const { data: merchants } = await query;
  let storeList = merchants || [];

  // Filter by category if specified
  if (category && category !== "All") {
    storeList = storeList.filter((m) => {
      const label = INDUSTRY_LABELS[m.industry || "other"] || "General & Other";
      return label === category;
    });
  }

  // Fetch product counts per merchant using individual count queries
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
    for (const c of counts) {
      countMap.set(c.id, c.count);
    }
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

  // Fetch up to 4 product image URLs per merchant for thumbnail grids
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

  return (
    <div className="min-h-screen bg-sand">
      <PublicNavbar />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {/* Page Title & Search */}
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-acacia-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-acacia">
            <ShieldCheck size={15} />
            Active stores with listed products
          </span>
          <h1 className="text-4xl font-black tracking-tight text-walnut sm:text-5xl">
            Browse Namibian stores
          </h1>
          <p className="mt-3 text-base leading-7 text-walnut-2">
            Discover local businesses, compare active stores, and order
            directly through WhatsApp.
          </p>
        </div>

        {/* Search Bar */}
        <form action="/stores" method="GET" className="max-w-lg mx-auto mb-10">
          <div className="relative">
            <Search
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-walnut-2/70"
            />
            <input
              type="text"
              name="q"
              defaultValue={q || ""}
              placeholder="Search stores by name..."
            className="w-full rounded-xl border border-border-warm bg-white py-3 pl-10 pr-4 text-walnut shadow-sm placeholder-walnut-2/70 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-terracotta"
            />
          </div>
        </form>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {CATEGORY_ORDER.map((cat) => {
            const isActive = cat === "All" ? !category : category === cat;
            const href = cat === "All"
              ? q ? `/stores?q=${q}` : "/stores"
              : q ? `/stores?q=${q}&category=${encodeURIComponent(cat)}` : `/stores?category=${encodeURIComponent(cat)}`;
            return (
              <Link
                key={cat}
                href={href}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  isActive
                    ? "bg-terracotta text-white border-terracotta"
                    : "bg-white text-walnut-2 border-border-warm hover:bg-sand-2"
                }`}
              >
                {cat}
              </Link>
            );
          })}
        </div>

        {/* Region filters */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {[{ value: "all", label: "All regions" }, ...NAMIBIA_REGIONS].map((r) => {
            const isActive = r.value === "all" ? !region : region === r.value;
            const params = new URLSearchParams();
            if (q) params.set("q", q);
            if (category && category !== "All") params.set("category", category);
            if (r.value !== "all") params.set("region", r.value);
            const href = `/stores${params.toString() ? `?${params.toString()}` : ""}`;
            return (
              <Link
                key={r.value}
                href={href}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  isActive
                    ? "bg-terracotta text-white border-terracotta"
                    : "bg-white text-walnut-2 border-border-warm hover:bg-sand-2"
                }`}
              >
                {r.label}
              </Link>
            );
          })}
        </div>

        {/* Results */}
        {q && (
          <p className="text-sm text-walnut-2 mb-4">
            {publicStoreList.length} result{publicStoreList.length !== 1 ? "s" : ""} for
            &ldquo;{q}&rdquo;
          </p>
        )}

        {publicStoreList.length === 0 ? (
          <div className="bg-white rounded-lg border border-border-warm p-12 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Store size={32} className="text-walnut-2/70" />
            </div>
            <h2 className="text-lg font-semibold text-walnut mb-2">
              {q ? "No stores found" : "No stores yet"}
            </h2>
            <p className="text-walnut-2 mb-6 max-w-sm mx-auto">
              {q
                ? `No stores matching "${q}". Try a different search.`
                : "Be the first to create a store on OshiCart!"}
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-terracotta text-white px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity font-medium"
            >
              Create Your Store
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {publicStoreList.map((merchant) => {
              const productCount = countMap.get(merchant.id) || 0;
              return (
                <Link
                  key={merchant.id}
                  href={`/s/${merchant.store_slug}`}
                  className="group overflow-hidden rounded-xl border border-border-warm bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <StoreThumbGrid
                        productImages={previewMap.get(merchant.id) ?? []}
                        fallbackInitial={merchant.store_name.charAt(0).toUpperCase()}
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-black text-walnut transition-colors group-hover:text-terracotta">
                          {merchant.store_name}
                        </h3>
                        {merchant.town && (
                          <p className="flex items-center gap-1 text-xs font-semibold text-acacia">
                            <MapPin size={12} /> {TOWN_LABELS[merchant.town] ?? ""}
                          </p>
                        )}
                        <p className="text-xs font-semibold text-walnut-2/70">
                          {INDUSTRY_LABELS[merchant.industry || "other"] || "General"} &middot; {productCount} product{productCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>

                    {merchant.description && (
                      <p className="mb-3 line-clamp-2 text-sm leading-6 text-walnut-2">
                        {merchant.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between border-t border-border-warm pt-3">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-acacia">
                        <MessageCircle size={14} />
                        WhatsApp Store
                      </span>
                      <span className="flex items-center gap-1 text-xs font-bold text-walnut-2/70 transition-colors group-hover:text-terracotta">
                        Visit Store <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* CTA for merchants */}
        <div className="mt-12 rounded-xl border border-border-warm bg-white p-8 text-center shadow-sm">
          <h3 className="mb-2 text-xl font-black text-walnut">
            Own a business in Namibia?
          </h3>
          <p className="text-walnut-2 text-sm mb-4">
            Create your free WhatsApp store in 5 minutes and reach more
            customers.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-terracotta text-white px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity font-medium text-sm"
          >
            Create Free Store <ArrowRight size={16} />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-4 sm:px-6 mt-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-3">
            <Image
              src="/oshicart-logo-v3.webp"
              alt={SITE_NAME}
              width={130}
              height={18}
              style={{ width: 130, height: "auto" }}
            />
            <span className="text-gray-500">- Made in Namibia</span>
          </div>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
