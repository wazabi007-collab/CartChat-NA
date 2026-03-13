import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MessageCircle, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { whatsappLink } from "@/lib/utils";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { showBranding, type SubscriptionTier } from "@/lib/tier-limits";
import { ProductCard } from "@/components/storefront/product-card";
import { TrackView } from "@/components/storefront/track-view";
import { ReportButton } from "@/components/storefront/report-button";

interface Props {
  params: Promise<{ slug: string }>;
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

export default async function StorefrontPage({ params }: Props) {
  const { slug } = await params;
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

  // Fetch subscription
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("tier, status")
    .eq("merchant_id", merchant.id)
    .single();

  const tier = (subscription?.tier ?? "oshi_start") as SubscriptionTier;
  const isSoftSuspended = subscription?.status === "soft_suspended";
  const hasBranding = showBranding(tier);

  // Fetch categories
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("merchant_id", merchant.id)
    .order("sort_order", { ascending: true });

  // Fetch available products
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("merchant_id", merchant.id)
    .eq("is_available", true)
    .order("sort_order", { ascending: true });

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
    sections.push({
      name: sections.length > 0 ? "Other" : "Products",
      products: uncategorized,
    });
  }

  const waLink = whatsappLink(
    merchant.whatsapp_number,
    `Hi ${merchant.store_name}, I'm browsing your store on OshiCart!`
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <TrackView merchantId={merchant.id} />
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

      {/* Products */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {allProducts.length === 0 ? (
          <p className="text-center text-gray-500 py-12">
            No products available yet. Check back soon!
          </p>
        ) : (
          <div className="space-y-8">
            {sections.map((section) => (
              <section key={section.name}>
                <h2 className="text-lg font-bold text-gray-900 mb-3">
                  {section.name}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {section.products.map((product) => (
                    <ProductCard
                      key={product.id}
                      id={product.id}
                      name={product.name}
                      price={product.price_nad}
                      imageUrl={product.images?.[0] ?? null}
                      slug={slug}
                      trackInventory={product.track_inventory}
                      stockQuantity={product.stock_quantity}
                      lowStockThreshold={product.low_stock_threshold}
                      allowBackorder={product.allow_backorder}
                      disabled={isSoftSuspended}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
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
