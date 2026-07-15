import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Store, Search, ArrowRight, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SITE_NAME, SITE_URL, NAMIBIA_REGIONS, REGION_LABELS } from "@/lib/constants";
import { fetchStoreListData, CATEGORY_ORDER } from "@/lib/storefront/store-list";
import { PublicNavbar } from "@/components/public-navbar";
import { StoreListCard } from "@/components/storefront/store-list-card";

interface Props {
  searchParams: Promise<{ q?: string; category?: string; region?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q, category, region } = await searchParams;

  // A region-only filter (no search/category) is the same content as the
  // dedicated /stores/[region] landing page — canonicalize to it so Google
  // doesn't see them as duplicate content.
  const isRegionOnly = region && region !== "all" && !q && (!category || category === "All");
  if (isRegionOnly && REGION_LABELS[region]) {
    return {
      title: `Shops & Stores in ${REGION_LABELS[region]}, Namibia`,
      description: `Browse Namibian businesses selling online in the ${REGION_LABELS[region]} region. Order via WhatsApp and pay locally — zero commission on ${SITE_NAME}.`,
      alternates: { canonical: `${SITE_URL}/stores/${region}` },
    };
  }

  return {
    title: "Browse Stores",
    description:
      "Discover Namibian businesses on OshiCart. Browse stores, shop products, and order via WhatsApp. Find restaurants, boutiques, and services near you.",
    alternates: { canonical: "/stores" },
  };
}

export default async function StoresPage({ searchParams }: Props) {
  const { q, category, region } = await searchParams;
  const supabase = await createClient();

  const publicStoreList = await fetchStoreListData(supabase, { region, q, category });

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
            const params = new URLSearchParams();
            if (q) params.set("q", q);
            if (cat !== "All") params.set("category", cat);
            if (region && region !== "all") params.set("region", region);
            const href = `/stores${params.toString() ? `?${params.toString()}` : ""}`;
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
            {publicStoreList.map((store) => (
              <StoreListCard key={store.id} store={store} />
            ))}
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

        {/* Browse by region — internal links to the SEO landing pages */}
        <div className="mt-10 text-center">
          <p className="mb-3 text-xs font-black uppercase tracking-wide text-walnut-2/70">
            Browse stores by region
          </p>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
            {NAMIBIA_REGIONS.map((r) => (
              <Link
                key={r.value}
                href={`/stores/${r.value}`}
                className="text-walnut-2 hover:text-terracotta hover:underline"
              >
                {r.label}
              </Link>
            ))}
          </div>
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
