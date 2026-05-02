import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Store, Search, ArrowRight, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SITE_NAME } from "@/lib/constants";
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
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;
  const supabase = await createClient();

  // Fetch all active merchants with their product count
  let query = supabase
    .from("merchants")
    .select("id, store_name, store_slug, description, logo_url, whatsapp_number, industry, created_at")
    .eq("is_active", true)
    .eq("store_status", "active")
    .order("created_at", { ascending: false });

  if (q && q.trim()) {
    query = query.or(
      `store_name.ilike.%${q.trim()}%,description.ilike.%${q.trim()}%`
    );
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

  // Fetch up to 4 product image URLs per merchant for thumbnail grids
  const merchantIds = storeList.map((m) => m.id);
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Page Title & Search */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-walnut">
            Browse Namibian Stores
          </h1>
          <p className="text-walnut-2 mt-2">
            Discover local businesses and shop directly via WhatsApp
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
              className="w-full pl-10 pr-4 py-3 border rounded-lg bg-white text-walnut placeholder-walnut-2/70 focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-transparent"
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

        {/* Results */}
        {q && (
          <p className="text-sm text-walnut-2 mb-4">
            {storeList.length} result{storeList.length !== 1 ? "s" : ""} for
            &ldquo;{q}&rdquo;
          </p>
        )}

        {storeList.length === 0 ? (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {storeList.map((merchant) => {
              const productCount = countMap.get(merchant.id) || 0;
              return (
                <Link
                  key={merchant.id}
                  href={`/s/${merchant.store_slug}`}
                  className="bg-white rounded-lg border border-border-warm hover:shadow-md transition-shadow overflow-hidden group"
                >
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <StoreThumbGrid
                        productImages={previewMap.get(merchant.id) ?? []}
                        fallbackInitial={merchant.store_name.charAt(0).toUpperCase()}
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-walnut truncate group-hover:text-terracotta transition-colors">
                          {merchant.store_name}
                        </h3>
                        <p className="text-xs text-walnut-2/70">
                          {INDUSTRY_LABELS[merchant.industry || "other"] || "General"} &middot; {productCount} product{productCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>

                    {merchant.description && (
                      <p className="text-sm text-walnut-2 line-clamp-2 mb-3">
                        {merchant.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-border-warm">
                      <span className="inline-flex items-center gap-1 text-xs text-acacia">
                        <MessageCircle size={14} />
                        WhatsApp Store
                      </span>
                      <span className="text-xs text-walnut-2/70 group-hover:text-terracotta transition-colors flex items-center gap-1">
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
        <div className="mt-12 text-center bg-white rounded-lg border border-border-warm p-8">
          <h3 className="text-lg font-semibold text-walnut mb-2">
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
              src="/logo.svg"
              alt={SITE_NAME}
              width={100}
              height={27}
              className="brightness-0 invert"
            />
            <span className="text-gray-500">— Made in Namibia</span>
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
