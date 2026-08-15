import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { formatPrice } from "@/lib/utils";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { showBranding, type SubscriptionTier } from "@/lib/tier-limits";
import { isOrderLimitReached } from "@/lib/order-limit";
import { JsonLd } from "@/components/json-ld";
import { PreviewBanner } from "@/components/storefront/preview-banner";
import { readPreviewState } from "@/lib/preview";
import { ProductPurchasePanel } from "./product-purchase-panel";
import { ProductGallery, VariantImagesProvider } from "./product-gallery";
import { StickyAddToCart } from "./sticky-add-to-cart";

interface Props {
  params: Promise<{ slug: string; productId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, productId } = await params;
  const supabase = await createClient();

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, store_name, industry")
    .eq("store_slug", slug)
    .eq("is_active", true)
    .eq("store_status", "active")
    .single();

  if (!merchant) return { title: "Not Found" };

  const { data: product } = await supabase
    .from("products")
    .select("name, description, images, price_nad")
    .eq("id", productId)
    .eq("merchant_id", merchant.id)
    .eq("is_available", true)
    .is("deleted_at", null)
    .single();

  if (!product) return { title: "Not Found" };

  const ogImage = product.images?.[0] || `${SITE_URL}/api/og/store/${slug}`;

  return {
    title: `${product.name} | ${merchant.store_name}`,
    description: product.description || `${product.name} - ${formatPrice(product.price_nad)}, from ${merchant.store_name} on ${SITE_NAME}. Order via WhatsApp.`,
    alternates: { canonical: `${SITE_URL}/s/${slug}/${productId}` },
    openGraph: {
      title: `${product.name} - ${formatPrice(product.price_nad)}`,
      description: product.description || `Buy ${product.name} from ${merchant.store_name}`,
      url: `${SITE_URL}/s/${slug}/${productId}`,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      type: "website",
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug, productId } = await params;
  const supabase = await createClient();

  const { previewCookie, userId } = await readPreviewState(supabase);

  // Fetch merchant — must be active and approved (unless previewing)
  let merchantQuery = supabase
    .from("merchants")
    .select("id, store_name, industry, user_id")
    .eq("store_slug", slug);
  if (!previewCookie) {
    merchantQuery = merchantQuery.eq("is_active", true).eq("store_status", "active");
  }
  const { data: merchant } = await merchantQuery.single();

  if (!merchant) notFound();

  const isPreview = previewCookie && !!userId && merchant.user_id === userId;

  // Fetch product, verify it belongs to this merchant
  let productQuery = supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("merchant_id", merchant.id)
    .is("deleted_at", null);
  if (!isPreview) productQuery = productQuery.eq("is_available", true);
  const { data: product } = await productQuery.single();

  if (!product) notFound();

  const [{ data: variants }, { data: subscription }] = await Promise.all([
    supabase
      .from("product_variants")
      .select("id, sku, price_nad, images, attributes, is_available, stock_quantity, track_inventory, allow_backorder, sort_order")
      .eq("product_id", product.id)
      .order("sort_order", { ascending: true })
      .order("sku", { ascending: true }),
    createServiceClient().from("subscriptions").select("tier, status").eq("merchant_id", merchant.id).single(),
  ]);

  // Same blocked-store gates as the storefront and checkout pages
  // Service client: subscriptions has RLS with no anon policy, so a public
  // visitor's client reads NULL and every store silently fell back to
  // oshi_start — paid stores kept the "Powered by OshiCart" badge and, worse,
  // were capped at the free tier's 20 orders a month. Only tier and status
  // are read; no billing detail reaches the page.
  const tier = (subscription?.tier ?? "oshi_start") as SubscriptionTier;
  const isSoftSuspended = subscription?.status === "soft_suspended";
  const orderingBlocked =
    isSoftSuspended || (await isOrderLimitReached(supabase, merchant.id, tier));

  const images = product.images ?? [];
  const productVariants = (variants || []).map((variant) => ({
    ...variant,
    attributes: (variant.attributes || {}) as Record<string, string>,
    images: variant.images || [],
  }));

  const isOutOfStock = product.track_inventory && product.stock_quantity === 0 && !product.allow_backorder;

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || `${product.name} from ${merchant.store_name}`,
    ...(images[0] && { image: images }),
    url: `${SITE_URL}/s/${slug}/${productId}`,
    offers: {
      "@type": "Offer",
      price: (product.price_nad / 100).toFixed(2),
      priceCurrency: "NAD",
      availability: isOutOfStock
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: merchant.store_name,
      },
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "OshiCart", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Stores", item: `${SITE_URL}/stores` },
      { "@type": "ListItem", position: 3, name: merchant.store_name, item: `${SITE_URL}/s/${slug}` },
      { "@type": "ListItem", position: 4, name: product.name },
    ],
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {isPreview && <PreviewBanner />}
      <JsonLd data={productSchema} />
      <JsonLd data={breadcrumbSchema} />
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
      {/* Back link */}
      <div className="bg-white border-b border-slate-200/70">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <Link
            href={`/s/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-950 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {merchant.store_name}
          </Link>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-7 md:py-8">
        <VariantImagesProvider>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-900/5 overflow-hidden">
          {/* Image section — switches to variant images when one is selected */}
          <ProductGallery images={images} productName={product.name} />

          {/* Product info */}
          <div className="p-4 sm:p-6">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-950">
              {product.name}
            </h1>
            <p className="text-2xl font-bold text-acacia mt-2">
              {formatPrice(product.price_nad)}
            </p>

            {product.description && (
              <div className="mt-4">
                <p className="text-slate-700 text-sm sm:text-base whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}

            {/* Stock status */}
            {product.track_inventory && (
              <div className="mt-3">
                {product.stock_quantity === 0 && !product.allow_backorder ? (
                  <span className="inline-block bg-red-100 text-red-700 text-sm font-medium px-3 py-1 rounded-full">
                    Out of Stock
                  </span>
                ) : (product.stock_quantity ?? 0) <= (product.low_stock_threshold ?? 5) ? (
                  <span className="inline-block bg-orange-100 text-orange-700 text-sm font-medium px-3 py-1 rounded-full">
                    Only {product.stock_quantity} left!
                  </span>
                ) : (
                  <span className="inline-block bg-green-100 text-green-700 text-sm font-medium px-3 py-1 rounded-full">
                    {Number(product.stock_quantity).toLocaleString("en-NA")} in stock
                  </span>
                )}
              </div>
            )}

            <div className="mt-6" data-add-to-cart-section>
              {orderingBlocked ? (
                <div className="space-y-3">
                  <button
                    disabled
                    className="w-full sm:w-auto bg-slate-200 text-slate-500 font-semibold py-3 px-8 rounded-xl cursor-not-allowed"
                  >
                    Ordering Paused
                  </button>
                  <p className="text-sm text-slate-500">
                    This store can&apos;t accept new orders right now — contact the merchant on WhatsApp.
                  </p>
                </div>
              ) : product.track_inventory && product.stock_quantity === 0 && !product.allow_backorder ? (
                <button
                  disabled
                  className="w-full sm:w-auto bg-slate-200 text-slate-500 font-semibold py-3 px-8 rounded-xl cursor-not-allowed"
                >
                  Out of Stock
                </button>
              ) : (
                <ProductPurchasePanel
                  product={{
                    id: product.id,
                    name: product.name,
                    price_nad: product.price_nad,
                    imageUrl: images[0] ?? null,
                    service_mode: product.service_mode ?? null,
                    item_type: product.item_type ?? null,
                    rental_unit: product.rental_unit ?? null,
                    deposit_nad: product.deposit_nad ?? null,
                  }}
                  variants={productVariants}
                  industry={merchant.industry}
                />
              )}
            </div>
          </div>
        </div>
        </VariantImagesProvider>
      </main>

      {/* Footer. The badge is what a paid plan removes — this page rendered it
          unconditionally, so paying merchants still carried OshiCart branding
          on every product page. scripts/check-branding-gate.ts now guards it. */}
      {showBranding(tier) && (
        <footer className="border-t border-slate-200 bg-white mt-8">
          <div className="max-w-4xl mx-auto px-4 py-4 text-center text-xs text-slate-400">
            Powered by {SITE_NAME}
          </div>
        </footer>
      )}

      {/* Sticky mobile Add to Cart — appears when main button scrolls out of view */}
      <StickyAddToCart
        productId={product.id}
        name={product.name}
        price={product.price_nad}
        imageUrl={images[0] ?? null}
        isOutOfStock={isOutOfStock || productVariants.length > 0 || orderingBlocked}
      />
    </div>
  );
}
