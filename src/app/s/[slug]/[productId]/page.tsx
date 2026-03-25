import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Home, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { JsonLd } from "@/components/json-ld";
import { AddToCartButton } from "./add-to-cart-button";
import { StickyAddToCart } from "./sticky-add-to-cart";

interface Props {
  params: Promise<{ slug: string; productId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, productId } = await params;
  const supabase = await createClient();

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, store_name")
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

  return {
    title: `${product.name} | ${merchant.store_name}`,
    description: product.description || `${product.name} - ${formatPrice(product.price_nad)}`,
    openGraph: {
      title: `${product.name} - ${formatPrice(product.price_nad)}`,
      description: product.description || `Buy ${product.name} from ${merchant.store_name}`,
      url: `${SITE_URL}/s/${slug}/${productId}`,
      ...(product.images?.[0] && { images: [{ url: product.images[0] }] }),
      type: "website",
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug, productId } = await params;
  const supabase = await createClient();

  // Fetch merchant — must be active and approved
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, store_name")
    .eq("store_slug", slug)
    .eq("is_active", true)
    .eq("store_status", "active")
    .single();

  if (!merchant) notFound();

  // Fetch product, verify it belongs to this merchant
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("merchant_id", merchant.id)
    .eq("is_available", true)
    .is("deleted_at", null)
    .single();

  if (!product) notFound();

  const images = product.images ?? [];

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
    <div className="min-h-screen bg-gray-50">
      <JsonLd data={productSchema} />
      <JsonLd data={breadcrumbSchema} />
      {/* Site Navigation — slim transparent bar */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between text-xs">
          <Link href="/" className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={12} />
            OshiCart
          </Link>
          <Link href="/stores" className="text-gray-400 hover:text-gray-600 transition-colors">
            Browse Stores
          </Link>
        </div>
      </nav>
      {/* Back link */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <Link
            href={`/s/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {merchant.store_name}
          </Link>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg border overflow-hidden">
          {/* Image section */}
          {images.length > 0 ? (
            <div className="relative">
              {images.length === 1 ? (
                <div className="aspect-square sm:aspect-[4/3] relative bg-gray-100">
                  <img
                    src={images[0]}
                    alt={product.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
                  {images.map((img: string, idx: number) => (
                    <div
                      key={idx}
                      className="aspect-square sm:aspect-[4/3] flex-shrink-0 w-full snap-center relative bg-gray-100"
                    >
                      <img
                        src={img}
                        alt={`${product.name} - Image ${idx + 1}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ))}
                </div>
              )}
              {images.length > 1 && (
                <div className="flex justify-center gap-1.5 py-2 bg-white">
                  {images.map((_: string, idx: number) => (
                    <div
                      key={idx}
                      className="w-2 h-2 rounded-full bg-gray-300"
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-square sm:aspect-[4/3] bg-gray-100 flex items-center justify-center">
              <span className="text-gray-300 text-6xl">
                {product.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Product info */}
          <div className="p-4 sm:p-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {product.name}
            </h1>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {formatPrice(product.price_nad)}
            </p>

            {product.description && (
              <div className="mt-4">
                <p className="text-gray-700 text-sm sm:text-base whitespace-pre-line">
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
                ) : product.stock_quantity <= (product.low_stock_threshold ?? 5) ? (
                  <span className="inline-block bg-orange-100 text-orange-700 text-sm font-medium px-3 py-1 rounded-full">
                    Only {product.stock_quantity} left!
                  </span>
                ) : (
                  <span className="inline-block bg-green-100 text-green-700 text-sm font-medium px-3 py-1 rounded-full">
                    In Stock
                  </span>
                )}
              </div>
            )}

            <div className="mt-6" data-add-to-cart-section>
              {product.track_inventory && product.stock_quantity === 0 && !product.allow_backorder ? (
                <button
                  disabled
                  className="w-full sm:w-auto bg-gray-300 text-gray-500 font-semibold py-3 px-8 rounded-md cursor-not-allowed"
                >
                  Out of Stock
                </button>
              ) : (
                <AddToCartButton
                  productId={product.id}
                  name={product.name}
                  price={product.price_nad}
                  imageUrl={images[0] ?? null}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-8">
        <div className="max-w-4xl mx-auto px-4 py-4 text-center text-xs text-gray-400">
          Powered by {SITE_NAME}
        </div>
      </footer>

      {/* Sticky mobile Add to Cart — appears when main button scrolls out of view */}
      <StickyAddToCart
        productId={product.id}
        name={product.name}
        price={product.price_nad}
        imageUrl={images[0] ?? null}
        isOutOfStock={isOutOfStock}
      />
    </div>
  );
}
