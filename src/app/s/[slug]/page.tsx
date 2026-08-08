import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Grid3X3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { usablePaymentMethods } from "@/lib/payment-methods";
import { SITE_NAME, SITE_URL, TOWN_LABELS, REGION_LABELS } from "@/lib/constants";
import { showBranding, type SubscriptionTier } from "@/lib/tier-limits";
import { isOrderLimitReached } from "@/lib/order-limit";
import { getThemeConfig } from "@/lib/industry";
import { TrackView } from "@/components/storefront/track-view";
import { ReportButton } from "@/components/storefront/report-button";
import { StorefrontProducts } from "@/components/storefront/storefront-products";
import { StorefrontSearch } from "@/components/storefront/search-bar";
import { StorefrontTabs } from "@/components/storefront/storefront-tabs";
import { OrderTracker } from "@/components/storefront/order-tracker";
import { StoreCover } from "@/components/storefront/store-cover";
import { StoreHeaderCard } from "@/components/storefront/store-header-card";
import { StorePaymentStrip } from "@/components/storefront/store-payment-strip";
import { StoreReviews, type StoreReview } from "@/components/storefront/store-reviews";
import { StoreCategoryGrid } from "@/components/storefront/store-category-grid";
import { JsonLd } from "@/components/json-ld";
import { PreviewBanner } from "@/components/storefront/preview-banner";
import { OwnerBar } from "@/components/storefront/owner-bar";
import { InstallBar } from "@/components/pwa/install-bar";
import { readPreviewState } from "@/lib/preview";

const PRODUCTS_PER_PAGE = 100;
const MAX_SEARCH_PRODUCT_IDS = 300;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; cat?: string; tab?: string; search?: string; sort?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: merchant } = await supabase
    .from("merchants")
    .select("store_name, description, logo_url, region, town")
    .eq("store_slug", slug)
    .eq("is_active", true)
    .eq("store_status", "active")
    .single();

  if (!merchant) return { title: "Store Not Found" };

  const locationSuffix = merchant.town ? ` — ${TOWN_LABELS[merchant.town] ?? merchant.town}, Namibia` : ", Namibia";
  const title = `${merchant.store_name}${locationSuffix}`;
  const description =
    merchant.description ||
    (merchant.town
      ? `Shop at ${merchant.store_name} in ${TOWN_LABELS[merchant.town] ?? merchant.town} on ${SITE_NAME}. Order via WhatsApp, pay locally.`
      : `Shop at ${merchant.store_name} on ${SITE_NAME}. Order via WhatsApp, pay locally.`);
  const ogImage = merchant.logo_url || `${SITE_URL}/og-default.png`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/s/${slug}` },
    openGraph: {
      title: `${merchant.store_name}${locationSuffix}`,
      description,
      url: `${SITE_URL}/s/${slug}`,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      type: "website",
    },
  };
}

export default async function StorefrontPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const normalizedSlug = slug.toLowerCase();
  if (slug !== normalizedSlug) {
    redirect(`/s/${normalizedSlug}`);
  }
  const { page: pageParam, cat: categoryFilter, tab, search: searchParam, sort: sortParam } = await searchParams;
  const searchTerm = (searchParam || "").trim().replace(/[(),]/g, " ").replace(/\s+/g, " ").slice(0, 80);
  // Build extra params string for pagination links
  const extraParams = [
    categoryFilter ? `cat=${categoryFilter}` : "",
    searchParam ? `search=${encodeURIComponent(searchParam)}` : "",
    sortParam ? `sort=${encodeURIComponent(sortParam)}` : "",
  ].filter(Boolean).join("&");
  const activeTab = tab === "orders" ? "orders" : "products";
  const currentPage = Math.max(1, parseInt(pageParam || "1") || 1);
  const supabase = await createClient();
  const { previewCookie, userId } = await readPreviewState(supabase);

  // Fetch merchant. Explicit public column list — payment credentials
  // (bank_account_*, momo/ewallet/pay2cell/paytoday numbers) are not readable
  // by anon/authenticated (migration 055) and are not needed to render a store.
  let merchantQuery = supabase
    .from("merchants")
    .select(
      "id, user_id, store_name, store_slug, description, whatsapp_number, logo_url, is_active, created_at, industry, delivery_slots, delivery_fee_nad, accepted_payment_methods, store_status, vat_number, vat_inclusive, pickup_address, pop_required, delivery_estimate, enabled_delivery_providers, region, town"
    )
    .eq("store_slug", slug);
  if (!previewCookie) {
    merchantQuery = merchantQuery.eq("is_active", true).eq("store_status", "active");
  }
  const { data: merchant } = await merchantQuery.single();

  if (!merchant) notFound();

  // The payment badges must match what checkout will actually offer, or the
  // store advertises a method the buyer then cannot select. Deciding that needs
  // the payment credentials, which anon cannot read (migration 055), so this
  // one small read goes through the service role — the same reason checkout
  // does. Only the booleans derived from it ever reach the browser.
  const { data: paymentDetails } = await createServiceClient()
    .from("merchants")
    .select("bank_name, bank_account_number, momo_number, ewallet_number, pay2cell_number, paytoday_number")
    .eq("id", merchant.id)
    .single();

  const advertisedPaymentMethods = usablePaymentMethods(
    merchant.accepted_payment_methods,
    paymentDetails ?? {}
  );

  // Reviews are verified-purchase only (migration 059), so this is a real
  // trust signal rather than anything a store can write about itself.
  const [{ data: ratingRows }, { data: reviewRows }] = await Promise.all([
    supabase.rpc("get_store_rating", { p_merchant_id: merchant.id }),
    supabase
      .from("reviews")
      .select("id, customer_name, rating, comment, merchant_reply, merchant_replied_at, created_at")
      .eq("merchant_id", merchant.id)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  const ratingRow = Array.isArray(ratingRows) ? ratingRows[0] : ratingRows;
  const reviewAverage = ratingRow?.average != null ? Number(ratingRow.average) : null;
  const reviewTotal = ratingRow?.total != null ? Number(ratingRow.total) : 0;
  const reviews = (reviewRows ?? []) as StoreReview[];

  const isOwner = !!userId && merchant.user_id === userId;
  const isPreview = previewCookie && isOwner;

  const variantSearchProductIds: string[] = [];
  if (searchTerm) {
    const { data: matchingVariants } = await supabase
      .from("product_variants")
      .select("product_id")
      .ilike("sku", `%${searchTerm}%`)
      .limit(MAX_SEARCH_PRODUCT_IDS);

    for (const row of matchingVariants || []) {
      if (row.product_id && !variantSearchProductIds.includes(row.product_id)) {
        variantSearchProductIds.push(row.product_id);
      }
    }
  }

  const searchFilterParts = searchTerm
    ? [
        `name.ilike.%${searchTerm}%`,
        `description.ilike.%${searchTerm}%`,
        `sku.ilike.%${searchTerm}%`,
        ...(variantSearchProductIds.length > 0 ? [`id.in.(${variantSearchProductIds.join(",")})`] : []),
      ]
    : [];

  // Parallel fetch: subscription, categories, category counts, product count
  const countQuery = supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("merchant_id", merchant.id)
    .is("deleted_at", null);
  if (!isPreview) countQuery.eq("is_available", true);
  if (categoryFilter) countQuery.eq("category_id", categoryFilter);
  if (searchFilterParts.length > 0) countQuery.or(searchFilterParts.join(","));

  const [subRes, catRes, countRes] = await Promise.all([
    supabase.from("subscriptions").select("tier, status").eq("merchant_id", merchant.id).single(),
    supabase.from("categories").select("*").eq("merchant_id", merchant.id).order("sort_order", { ascending: true }),
    countQuery,
  ]);

  const subscription = subRes.data;
  const categories = catRes.data;
  const tier = (subscription?.tier ?? "oshi_start") as SubscriptionTier;
  const isSoftSuspended = subscription?.status === "soft_suspended";
  // Same monthly order-limit gate as checkout — block ordering here too
  const orderLimitReached = isSoftSuspended
    ? false
    : await isOrderLimitReached(supabase, merchant.id, tier);
  const orderingBlocked = isSoftSuspended || orderLimitReached;
  const hasBranding = showBranding(tier);
  const theme = getThemeConfig(merchant.industry);

  // Per-category product counts + up to 4 preview images in ONE query (RPC) instead of
  // two queries per category. See migration 051 (storefront_category_meta). It is
  // SECURITY INVOKER, so RLS still applies and it returns exactly the products the
  // storefront is allowed to show.
  const catCountMap = new Map<string, number>();
  const catImageMap = new Map<string, string[]>();
  if (categories && categories.length > 0) {
    const { data: catMeta } = await supabase.rpc("storefront_category_meta", {
      p_merchant_id: merchant.id,
    });
    const metaRows = (catMeta ?? []) as {
      category_id: string;
      product_count: number;
      preview_images: string[] | null;
    }[];
    for (const row of metaRows) {
      catCountMap.set(row.category_id, Number(row.product_count) || 0);
      catImageMap.set(row.category_id, (row.preview_images ?? []).filter(Boolean).slice(0, 4));
    }
  }

  const activeCategories = (categories || []).filter((c) => (catCountMap.get(c.id) || 0) > 0);
  const selectedCategory = categoryFilter ? (categories || []).find((c) => c.id === categoryFilter) : null;
  const totalProducts = countRes.count;

  const totalCount = totalProducts || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PRODUCTS_PER_PAGE));
  const showFolders = !searchTerm && !categoryFilter && activeCategories.length >= 3 && totalCount > 20;
  const offset = (currentPage - 1) * PRODUCTS_PER_PAGE;

  // Fetch available products (paginated, filtered by category if set)
  let productQuery = supabase
    .from("products")
    .select("*")
    .eq("merchant_id", merchant.id)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .range(offset, offset + PRODUCTS_PER_PAGE - 1);
  if (!isPreview) productQuery = productQuery.eq("is_available", true);
  if (categoryFilter) productQuery = productQuery.eq("category_id", categoryFilter);
  if (searchFilterParts.length > 0) productQuery = productQuery.or(searchFilterParts.join(","));
  const { data: products } = await productQuery;
  const productIds = (products || []).map((product) => product.id);
  const variantProductIds = new Set<string>();
  if (productIds.length > 0) {
    const { data: variantRows } = await supabase
      .from("product_variants")
      .select("product_id")
      .in("product_id", productIds);
    for (const row of variantRows || []) {
      variantProductIds.add(row.product_id);
    }
  }

  const allProducts = (products ?? []).map((product) => ({
    ...product,
    has_variants: variantProductIds.has(product.id),
  }));

  // Group products by category
  const categoryMap = new Map<string | null, typeof allProducts>();

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
    // A service merchant's heading comes from their archetype. Relying only on
    // the per-product item_type flag meant genuine service businesses were
    // headed "Products", because almost nobody sets that flag.
    const sellsServices =
      theme?.isService ||
      uncategorized.every((p: { item_type?: string }) => p.item_type === "service");
    const fallbackName =
      sections.length > 0
        ? sellsServices
          ? "More Services"
          : "More Products"
        : sellsServices
        ? theme?.sectionLabel ?? "Services"
        : "Products";
    sections.push({ name: fallbackName, products: uncategorized });
  }

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
    address: {
      "@type": "PostalAddress",
      addressCountry: "NA",
      ...(merchant.town && { addressLocality: TOWN_LABELS[merchant.town] ?? merchant.town }),
      ...(merchant.region && { addressRegion: REGION_LABELS[merchant.region] ?? merchant.region }),
    },
    telephone: merchant.whatsapp_number,
  };

  const locationLabel = merchant.town
    ? [TOWN_LABELS[merchant.town], merchant.region ? REGION_LABELS[merchant.region] : null]
        .filter(Boolean)
        .join(", ")
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Preview mode already carries a dashboard link, so never show both. */}
      {isPreview ? <PreviewBanner /> : isOwner && <OwnerBar />}
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={localBusinessSchema} />
      {!isPreview && <TrackView merchantId={merchant.id} />}
      {/* Site Navigation — slim transparent bar */}
      <nav className="bg-white/90 border-b border-slate-200/70 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between text-xs">
          <Link href="/" className="flex items-center gap-1 text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft size={12} />
            OshiCart
          </Link>
          <Link href="/stores" className="text-slate-500 hover:text-slate-900 transition-colors">
            Browse Stores
          </Link>
        </div>
      </nav>
      {/* Store Header — revamped */}
      <header>
        <StoreCover archetype={merchant.industry} />
        <StoreHeaderCard
          store={{
            storeName: merchant.store_name,
            description: merchant.description,
            logoUrl: merchant.logo_url,
            industry: merchant.industry,
            location: locationLabel,
            phone: null,
            whatsappNumber: merchant.whatsapp_number,
            openingHours: null,
            rating: reviewAverage,
            orderCount: reviewTotal,
            deliveryEstimate: merchant.delivery_estimate,
            slug: merchant.store_slug,
          }}
          storeUrl={`${SITE_URL}/s/${slug}`}
          qrUrl={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${SITE_URL}/s/${slug}`)}&margin=10`}
        />
      </header>
      <StorePaymentStrip methods={advertisedPaymentMethods} />

      {/* Soft-suspend banner */}
      {isSoftSuspended && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2 text-amber-800 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <p>Ordering is paused for this store right now. You can still browse products, but new orders can&apos;t be placed.</p>
          </div>
        </div>
      )}

      {/* Monthly order-limit banner */}
      {!isSoftSuspended && orderLimitReached && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2 text-amber-800 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <p>This store can&apos;t accept new orders right now — contact the merchant on WhatsApp.</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white/95 border-y border-slate-200/70 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4">
          <StorefrontTabs slug={slug} activeTab={activeTab} />
        </div>
      </div>

      {/* Content */}
      <main
        className="max-w-4xl mx-auto px-4 py-7 md:py-8"
        style={theme ? { backgroundColor: theme.bgTint } : undefined}
      >
        <InstallBar />

        {activeTab === "orders" ? (
          <div className="max-w-lg mx-auto py-4">
            <h2 className="text-lg font-bold text-slate-950 mb-1">Track Your Order</h2>
            <p className="text-sm text-slate-500 mb-4">
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
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-950 transition-colors"
            >
              <ArrowLeft size={14} />
              All Categories
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-medium text-slate-950">{selectedCategory.name}</span>
            <span className="text-xs text-slate-400">({totalCount})</span>
          </div>
        )}

        {/* Category folder grid */}
        {showFolders ? (
          <div>
            <div className="mb-6">
              <StorefrontSearch
                accentColor={theme?.accent}
                initialQuery={searchTerm}
              />
            </div>
            <div className="flex items-center gap-2 mb-4">
              <Grid3X3 size={18} className="text-slate-400" />
              <h2 className="text-lg font-bold text-slate-950">Browse by Category</h2>
            </div>
            <StoreCategoryGrid
              storeSlug={slug}
              categories={activeCategories.map((c) => ({
                slug: c.id,
                name: c.name,
                productCount: catCountMap.get(c.id) ?? 0,
                imageUrls: catImageMap.get(c.id) ?? [],
              }))}
            />
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
            disabled={orderingBlocked}
            whatsappNumber={merchant.whatsapp_number}
            storeName={merchant.store_name}
            searchQuery={searchTerm}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8 pt-6 border-t border-slate-200">
              {currentPage > 1 && (
                <a
                  href={`/s/${slug}?page=${currentPage - 1}${extraParams ? `&${extraParams}` : ""}`}
                  className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-white transition-colors"
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
                        : "border border-slate-200 hover:bg-white"
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
                  className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-white transition-colors"
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

        <div className="mt-10">
          <StoreReviews
            reviews={reviews}
            average={reviewAverage}
            total={reviewTotal}
            storeName={merchant.store_name}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-8">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between text-xs text-gray-400">
          {hasBranding ? (
            <a href={SITE_URL} className="hover:text-gray-600 transition-colors">
              Powered by {SITE_NAME}
            </a>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-4">
            {/* The merchant's own route back in when they are signed out.
                Deliberately quiet — shoppers have no use for it. */}
            {!isOwner && (
              <Link href="/login" className="transition-colors hover:text-gray-600">
                Store owner? Sign in
              </Link>
            )}
            {!isPreview && (
              <ReportButton merchantId={merchant.id} storeName={merchant.store_name} />
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
