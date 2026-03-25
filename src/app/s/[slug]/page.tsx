import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, AlertTriangle, ArrowLeft, Grid3X3, Home, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { whatsappLink } from "@/lib/utils";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { showBranding, type SubscriptionTier } from "@/lib/tier-limits";
import { getThemeConfig } from "@/lib/industry";
import { TrackView } from "@/components/storefront/track-view";
import { ReportButton } from "@/components/storefront/report-button";
import { StorefrontProducts } from "@/components/storefront/storefront-products";
import { StorefrontTabs } from "@/components/storefront/storefront-tabs";
import { OrderTracker } from "@/components/storefront/order-tracker";
import { JsonLd } from "@/components/json-ld";

const PRODUCTS_PER_PAGE = 100;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; cat?: string; tab?: string; search?: string; sort?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: merchant } = await supabase
    .from("merchants")
    .select("store_name, description, logo_url")
    .eq("store_slug", slug)
    .eq("is_active", true)
    .eq("store_status", "active")
    .single();

  if (!merchant) return { title: "Store Not Found" };

  return {
    title: `${merchant.store_name} | ${SITE_NAME}`,
    description: merchant.description || `Shop at ${merchant.store_name} on ${SITE_NAME}`,
    openGraph: {
      title: merchant.store_name,
      description: merchant.description || `Shop at ${merchant.store_name}`,
      url: `${SITE_URL}/s/${slug}`,
      images: merchant.logo_url ? [{ url: merchant.logo_url }] : [],
      type: "website",
    },
  };
}

export default async function StorefrontPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageParam, cat: categoryFilter, tab, search: searchParam, sort: sortParam } = await searchParams;
  // Build extra params string for pagination links
  const extraParams = [
    categoryFilter ? `cat=${categoryFilter}` : "",
    searchParam ? `search=${encodeURIComponent(searchParam)}` : "",
    sortParam ? `sort=${encodeURIComponent(sortParam)}` : "",
  ].filter(Boolean).join("&");
  const activeTab = tab === "orders" ? "orders" : "products";
  const currentPage = Math.max(1, parseInt(pageParam || "1") || 1);
  const supabase = await createClient();

  // Fetch merchant
  const { data: merchant } = await supabase
    .from("merchants")
    .select("*")
    .eq("store_slug", slug)
    .eq("is_active", true)
    .eq("store_status", "active")
    .single();

  if (!merchant) notFound();

  // Parallel fetch: subscription, categories, category counts, product count
  const countQuery = supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("merchant_id", merchant.id)
    .eq("is_available", true)
    .is("deleted_at", null);
  if (categoryFilter) countQuery.eq("category_id", categoryFilter);

  const [subRes, catRes, countRes] = await Promise.all([
    supabase.from("subscriptions").select("tier, status").eq("merchant_id", merchant.id).single(),
    supabase.from("categories").select("*").eq("merchant_id", merchant.id).order("sort_order", { ascending: true }),
    countQuery,
  ]);

  const subscription = subRes.data;
  const categories = catRes.data;
  const tier = (subscription?.tier ?? "oshi_start") as SubscriptionTier;
  const isSoftSuspended = subscription?.status === "soft_suspended";
  const hasBranding = showBranding(tier);
  const theme = getThemeConfig(merchant.industry);

  // Get accurate per-category product counts using exact count queries
  const catCountMap = new Map<string, number>();
  if (categories && categories.length > 0) {
    const catCountPromises = categories.map(async (cat) => {
      const { count } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("merchant_id", merchant.id)
        .eq("category_id", cat.id)
        .eq("is_available", true)
        .is("deleted_at", null);
      return { id: cat.id, count: count || 0 };
    });
    const catCounts = await Promise.all(catCountPromises);
    for (const c of catCounts) {
      catCountMap.set(c.id, c.count);
    }
  }

  const activeCategories = (categories || []).filter((c) => (catCountMap.get(c.id) || 0) > 0);
  const selectedCategory = categoryFilter ? (categories || []).find((c) => c.id === categoryFilter) : null;
  const totalProducts = countRes.count;

  const totalCount = totalProducts || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PRODUCTS_PER_PAGE));
  const showFolders = !categoryFilter && activeCategories.length >= 3 && totalCount > 20;
  const offset = (currentPage - 1) * PRODUCTS_PER_PAGE;

  // Fetch available products (paginated, filtered by category if set)
  let productQuery = supabase
    .from("products")
    .select("*")
    .eq("merchant_id", merchant.id)
    .eq("is_available", true)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .range(offset, offset + PRODUCTS_PER_PAGE - 1);
  if (categoryFilter) productQuery = productQuery.eq("category_id", categoryFilter);
  const { data: products } = await productQuery;

  // Group products by category
  const categoryMap = new Map<string | null, typeof products>();
  const allProducts = products ?? [];

  for (const product of allProducts) {
    const key = product.category_id;
    if (!categoryMap.has(key)) {
      categoryMap.set(key, []);
    }
    categoryMap.get(key)!.push(product);
  }

  // Build ordered sections: named categories first, then uncategorized
  const sections: { name: string; products: typeof allProducts }[] = [];

  if (categories) {
    for (const cat of categories) {
      const catProducts = categoryMap.get(cat.id);
      if (catProducts && catProducts.length > 0) {
        sections.push({ name: cat.name, products: catProducts });
      }
    }
  }

  const uncategorized = categoryMap.get(null);
  if (uncategorized && uncategorized.length > 0) {
    let fallbackName: string;
    if (sections.length > 0) {
      fallbackName = "Other";
    } else {
      // Use theme label only if all items are services; otherwise "Products"
      const allServices = uncategorized.every((p: { item_type?: string }) => p.item_type === "service");
      fallbackName = allServices ? (theme?.sectionLabel ?? "Products") : "Products";
    }
    sections.push({ name: fallbackName, products: uncategorized });
  }

  const waLink = whatsappLink(
    merchant.whatsapp_number,
    `Hi ${merchant.store_name}, I'm browsing your store on OshiCart!`
  );

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "OshiCart", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Stores", item: `${SITE_URL}/stores` },
      { "@type": "ListItem", position: 3, name: merchant.store_name },
    ],
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: merchant.store_name,
    description: merchant.description || `Shop at ${merchant.store_name} on OshiCart`,
    url: `${SITE_URL}/s/${slug}`,
    ...(merchant.logo_url && { image: merchant.logo_url }),
    address: { "@type": "PostalAddress", addressCountry: "NA" },
    telephone: merchant.whatsapp_number,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={localBusinessSchema} />
      <TrackView merchantId={merchant.id} />
      {/* Site Navigation */}
      <nav className="bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between text-sm">
          <Link href="/" className="flex items-center gap-1.5 hover:text-green-400 transition-colors">
            <Home size={14} />
            OshiCart
          </Link>
          <Link href="/stores" className="flex items-center gap-1.5 hover:text-green-400 transition-colors">
            <Store size={14} />
            Browse Stores
          </Link>
        </div>
      </nav>
      {/* Store Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {merchant.logo_url ? (
              <img
                src={merchant.logo_url}
                alt={merchant.store_name}
                className="w-14 h-14 rounded-full object-cover border"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-700 font-bold text-xl">
                  {merchant.store_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">
                {merchant.store_name}
              </h1>
              {merchant.description && (
                <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                  {merchant.description}
                </p>
              )}
            </div>
          </div>

          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp Us
          </a>
        </div>
      </header>

      {/* Soft-suspend banner */}
      {isSoftSuspended && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2 text-amber-800 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <p>This store is temporarily unavailable for orders.</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4">
          <StorefrontTabs slug={slug} activeTab={activeTab} />
        </div>
      </div>

      {/* Content */}
      <main
        className="max-w-4xl mx-auto px-4 py-6"
        style={theme ? { backgroundColor: theme.bgTint } : undefined}
      >
        {activeTab === "orders" ? (
          <div className="max-w-lg mx-auto py-4">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Track Your Order</h2>
            <p className="text-sm text-gray-500 mb-4">
              Enter the WhatsApp number you used when placing your order to see its status.
            </p>
            <OrderTracker merchantId={merchant.id} />
          </div>
        ) : (
        <>
        {/* Category breadcrumb when filtering */}
        {selectedCategory && (
          <div className="flex items-center gap-2 mb-4">
            <Link
              href={`/s/${slug}`}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={14} />
              All Categories
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-medium text-gray-900">{selectedCategory.name}</span>
            <span className="text-xs text-gray-400">({totalCount})</span>
          </div>
        )}

        {/* Category folder grid */}
        {showFolders ? (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Grid3X3 size={18} className="text-gray-400" />
              <h2 className="text-lg font-bold text-gray-900">Browse by Category</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {activeCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/s/${slug}?cat=${cat.id}`}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-gray-300 transition-all group"
                >
                  <div className="aspect-[4/3] relative bg-gray-100">
                    {cat.image_url ? (
                      <img
                        src={cat.image_url}
                        alt={cat.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={theme ? { backgroundColor: theme.bgTint } : undefined}>
                        <Grid3X3 size={32} className="text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm text-gray-900 truncate group-hover:text-green-600 transition-colors" style={theme ? { color: undefined } : undefined}>
                      {cat.name}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {catCountMap.get(cat.id) || 0} product{(catCountMap.get(cat.id) || 0) !== 1 ? "s" : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : allProducts.length === 0 && !categoryFilter ? (
          <p className="text-center text-gray-500 py-12">
            No products available yet. Check back soon!
          </p>
        ) : allProducts.length === 0 && categoryFilter ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No products in this category.</p>
            <Link href={`/s/${slug}`} className="text-sm text-green-600 hover:underline mt-2 inline-block">
              Browse all categories
            </Link>
          </div>
        ) : (
          <>
          <StorefrontProducts
            sections={sections}
            allProducts={allProducts}
            theme={theme}
            slug={slug}
            disabled={isSoftSuspended}
            whatsappNumber={merchant.whatsapp_number}
            storeName={merchant.store_name}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8 pt-6 border-t">
              {currentPage > 1 && (
                <a
                  href={`/s/${slug}?page=${currentPage - 1}${extraParams ? `&${extraParams}` : ""}`}
                  className="px-4 py-2 text-sm border rounded-lg hover:bg-white transition-colors"
                >
                  Previous
                </a>
              )}
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (currentPage <= 4) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
                } else {
                  pageNum = currentPage - 3 + i;
                }
                return (
                  <a
                    key={pageNum}
                    href={`/s/${slug}?page=${pageNum}${extraParams ? `&${extraParams}` : ""}`}
                    className={`w-10 h-10 flex items-center justify-center text-sm rounded-lg transition-colors ${
                      pageNum === currentPage
                        ? "bg-gray-900 text-white"
                        : "border hover:bg-white"
                    }`}
                    style={pageNum === currentPage && theme ? { backgroundColor: theme.accent } : undefined}
                  >
                    {pageNum}
                  </a>
                );
              })}
              {currentPage < totalPages && (
                <a
                  href={`/s/${slug}?page=${currentPage + 1}${extraParams ? `&${extraParams}` : ""}`}
                  className="px-4 py-2 text-sm border rounded-lg hover:bg-white transition-colors"
                >
                  Next
                </a>
              )}
              <span className="text-xs text-gray-400 ml-2">
                {totalCount} products
              </span>
            </div>
          )}
          </>
        )}
        </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-8">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between text-xs text-gray-400">
          {hasBranding ? (
            <a href={SITE_URL} className="hover:text-gray-600 transition-colors">
              Powered by {SITE_NAME}
            </a>
          ) : (
            <span />
          )}
          <ReportButton merchantId={merchant.id} storeName={merchant.store_name} />
        </div>
      </footer>
    </div>
  );
}
