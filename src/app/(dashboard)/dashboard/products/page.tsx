import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Package, Layers3, Image as ImageIcon, Sparkles, Upload } from "lucide-react";
import { ProductGrid } from "./product-actions";
import { getServiceLabels } from "@/lib/service-labels";
import { TIER_LIMITS, type SubscriptionTier } from "@/lib/tier-limits";
import { createServiceClient } from "@/lib/supabase/service";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ img_notice?: string }>;
}) {
  const sp = await searchParams;
  const imgNotice = sp?.img_notice;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: merchant } = await supabase
    .from("merchants")
    // Named columns, never "*" — see the note in ../page.tsx.
    .select("id, industry")
    .eq("user_id", user.id)
    .single();

  if (!merchant) redirect("/dashboard/setup");

  const labels = getServiceLabels(merchant.industry);

  const [{ data: products }, { data: subscription }, totalProductsResult] = await Promise.all([
    supabase
      .from("products")
      .select("*, categories(name)")
      .eq("merchant_id", merchant.id)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("subscriptions")
      .select("tier")
      .eq("merchant_id", merchant.id)
      .single(),
    // Includes soft-deleted — counts toward tier limit by design
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("merchant_id", merchant.id),
  ]);

  const productList = products || [];
  const service = createServiceClient();
  const { data: openAppeals } = await service
    .from("safety_reviews")
    .select("product_id")
    .eq("merchant_id", merchant.id)
    .eq("review_type", "merchant_appeal")
    .eq("status", "open");
  const appealedProductIds = new Set(
    (openAppeals ?? []).map((r) => r.product_id).filter((x): x is string => x !== null)
  );
  const availableCount = productList.filter((p) => p.is_available).length;
  const imageCount = productList.filter((p) => Array.isArray(p.images) && p.images.length > 0).length;

  const tier = (subscription?.tier ?? "oshi_start") as SubscriptionTier;
  const productLimit = TIER_LIMITS[tier].products;
  const quotaUsed = totalProductsResult.count || 0;
  const quotaPercent = productLimit === -1 ? 0 : Math.min(100, Math.round((quotaUsed / Math.max(productLimit, 1)) * 100));

  return (
    <div className="md:ml-56">
      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-acacia">
              Catalog
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              {labels.itemPlural}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Keep your storefront polished with clear pricing, attractive photos,
              and availability that is easy for customers to trust.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/products/categories"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Categories
            </Link>
            <Link
              href="/dashboard/products/import"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              <Upload size={16} />
              Import
            </Link>
            <Link
              href="/dashboard/products/new"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-acacia px-4 text-sm font-black text-white shadow-sm shadow-emerald-900/20 transition hover:bg-green-700"
            >
              <Plus size={18} />
              {labels.addItem}
            </Link>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              <Layers3 size={14} />
              Listed
            </div>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {productLimit === -1 ? quotaUsed : `${quotaUsed} / ${productLimit}`}
            </p>
            {productLimit !== -1 && (
              <>
                <div className="mt-2 h-1.5 rounded-full bg-slate-200">
                  <div
                    className={`h-1.5 rounded-full ${quotaPercent >= 80 ? "bg-amber-500" : "bg-acacia"}`}
                    style={{ width: `${quotaPercent}%` }}
                  />
                </div>
                {quotaPercent >= 80 && (
                  <Link href="/pricing" className="mt-1.5 inline-block text-xs font-bold text-acacia hover:underline">
                    Upgrade
                  </Link>
                )}
              </>
            )}
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-700">
              <Sparkles size={14} />
              Available
            </div>
            <p className="mt-2 text-2xl font-black text-emerald-700">{availableCount}</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-700">
              <ImageIcon size={14} />
              With photos
            </div>
            <p className="mt-2 text-2xl font-black text-blue-700">{imageCount}</p>
          </div>
        </div>
      </div>

      {imgNotice && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Your product was saved, but one or more photos didn&apos;t upload. Open the product to add them.
        </div>
      )}

      {productList.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Package size={32} className="text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            No {labels.itemPlural.toLowerCase()} yet
          </h2>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Start building your catalog by adding your first {labels.item.toLowerCase()}. Your
            customers will see these in your WhatsApp store.
          </p>
          <Link
            href="/dashboard/products/new"
            className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <Plus size={18} />
            {labels.firstItem}
          </Link>
        </div>
      ) : (
        <ProductGrid
          products={productList.map((p) => ({
            id: p.id,
            name: p.name,
            price_nad: p.price_nad,
            images: p.images,
            is_available: p.is_available,
            track_inventory: p.track_inventory ?? false,
            stock_quantity: p.stock_quantity ?? 0,
            low_stock_threshold: p.low_stock_threshold ?? 5,
            allow_backorder: p.allow_backorder ?? false,
            sku: p.sku ?? null,
            moderation_status: p.moderation_status ?? "approved",
            moderation_reasons: p.moderation_reasons ?? [],
            hasOpenAppeal: appealedProductIds.has(p.id),
            category_name: (p.categories as { name: string } | null)?.name ?? null,
          }))}
        />
      )}

      {/* Mobile floating action button */}
      <Link
        href="/dashboard/products/new"
        className="fixed bottom-20 right-4 z-40 md:hidden w-14 h-14 bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-green-700 transition-colors active:scale-95"
        aria-label={labels.addItem}
      >
        <Plus size={24} />
      </Link>
    </div>
  );
}
