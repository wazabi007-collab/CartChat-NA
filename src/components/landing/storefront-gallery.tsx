import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Package,
  Scissors,
  ShoppingBag,
  Sparkles,
  Watch,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type StorePreview = {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  description: string | null;
  logoUrl: string | null;
  productCount: number;
  productImages: string[];
  visualType: "promo" | "beauty" | "leather";
};

const FEATURED_SLUGS = [
  "octovia-nexus",
  "apatchy-beard-company",
  "krotoa-leather-goods",
];

const INDUSTRY_LABELS: Record<string, string> = {
  restaurant: "Food",
  takeaway: "Food",
  cafe: "Food",
  bakery: "Food",
  catering: "Food",
  grocery: "Grocery",
  fashion: "Fashion",
  electronics: "Electronics",
  hardware: "Hardware",
  salon: "Beauty",
  cosmetics: "Beauty",
  cleaning: "Services",
  printing: "Services",
  services: "Services",
  flowers: "Gifting",
  furniture: "Home",
};

const FALLBACK_STORES: StorePreview[] = [
  {
    id: "fallback-octovia",
    name: "Octovia Nexus",
    slug: "octovia-nexus",
    industry: "services",
    description: "Promo items and business products with a clean online catalog.",
    logoUrl: null,
    productCount: 1976,
    productImages: [],
    visualType: "promo",
  },
  {
    id: "fallback-apatchy",
    name: "Apatchy Beard Company",
    slug: "apatchy-beard-company",
    industry: "cosmetics",
    description: "Natural beard care products with WhatsApp ordering.",
    logoUrl: null,
    productCount: 3,
    productImages: [],
    visualType: "beauty",
  },
  {
    id: "fallback-krotoa",
    name: "Krotoa Leather Goods",
    slug: "krotoa-leather-goods",
    industry: "fashion",
    description: "Handcrafted leather goods from Namibia.",
    logoUrl: null,
    productCount: 10,
    productImages: [],
    visualType: "leather",
  },
];

export async function StorefrontGallery() {
  const stores = await getFeaturedStores();

  return (
    <section className="bg-sand py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-terracotta">
              Live marketplace proof
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-walnut sm:text-4xl">
              Featured Namibian stores.
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-walnut-2">
              A curated look at stores already using OshiCart, with visuals
              that make the marketplace feel active, local, and ready to shop.
            </p>
          </div>
          <Link
            href="/stores"
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-walnut px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#1d2a3c]"
          >
            Browse all stores <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {stores.map((store) => (
            <Link
              key={store.id}
              href={`/s/${store.slug}`}
              className="group overflow-hidden rounded-2xl border border-border-warm bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="grid aspect-[4/3] grid-cols-2 grid-rows-2 gap-px bg-sand-2">
                {store.productImages.length > 0 ? (
                  store.productImages.slice(0, 4).map((src, index) => (
                    <div key={`${src}-${index}`} className="relative bg-sand-2">
                      <Image
                        src={src}
                        alt=""
                        fill
                        sizes="(min-width:1024px) 30vw, (min-width:640px) 45vw, 90vw"
                        className="object-cover"
                      />
                    </div>
                  ))
                ) : (
                  <StoreArtwork type={store.visualType} storeName={store.name} />
                )}
              </div>

              <div className="p-5">
                <div className="mb-3 flex items-center gap-3">
                  {store.logoUrl ? (
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border-warm bg-white">
                      <Image
                        src={store.logoUrl}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terracotta-soft text-sm font-black text-terracotta">
                      {store.name.charAt(0)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-walnut">
                      {store.name}
                    </p>
                    <p className="text-xs font-bold text-acacia">
                      {INDUSTRY_LABELS[store.industry || ""] || "Local store"} ·{" "}
                      {store.productCount} products
                    </p>
                  </div>
                </div>
                {store.description && (
                  <p className="line-clamp-2 text-sm leading-6 text-walnut-2">
                    {store.description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

async function getFeaturedStores(): Promise<StorePreview[]> {
  return Promise.race([
    getFeaturedStoresFromDatabase(),
    new Promise<StorePreview[]>((resolve) =>
      setTimeout(() => resolve(FALLBACK_STORES), 2500)
    ),
  ]);
}

async function getFeaturedStoresFromDatabase(): Promise<StorePreview[]> {
  const supabase = await createClient();
  const { data: merchants } = await supabase
    .from("merchants")
    .select("id, store_name, store_slug, description, logo_url, industry")
    .eq("is_active", true)
    .eq("store_status", "active")
    .in("store_slug", FEATURED_SLUGS);

  const candidates = merchants || [];
  if (candidates.length === 0) return FALLBACK_STORES;

  const storeRows = await Promise.all(
    FEATURED_SLUGS.map(async (slug) => {
      const fallback = FALLBACK_STORES.find((store) => store.slug === slug);
      const merchant = candidates.find((row) => row.store_slug === slug);
      if (!merchant) return fallback ?? null;

      const { count } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("merchant_id", merchant.id)
        .eq("is_available", true)
        .is("deleted_at", null);

      const { data: products } = await supabase
        .from("products")
        .select("image_url")
        .eq("merchant_id", merchant.id)
        .eq("is_available", true)
        .is("deleted_at", null)
        .not("image_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(4);

      return {
        id: merchant.id,
        name: merchant.store_name,
        slug: merchant.store_slug,
        industry: merchant.industry,
        description: merchant.description,
        logoUrl: merchant.logo_url,
        productCount: count || fallback?.productCount || 0,
        productImages:
          products?.map((product) => product.image_url).filter(Boolean) || [],
        visualType: fallback?.visualType || "promo",
      };
    })
  );

  const activeStores = storeRows.filter(
    (store): store is StorePreview => Boolean(store)
  );

  return activeStores.length > 0 ? activeStores : FALLBACK_STORES;
}

function StoreArtwork({
  type,
  storeName,
}: {
  type: StorePreview["visualType"];
  storeName: string;
}) {
  if (type === "beauty") {
    return (
      <div className="col-span-2 row-span-2 overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-blue-100 p-4">
        <div className="flex h-full flex-col justify-between rounded-2xl border border-white/70 bg-white/55 p-4 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-acacia px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white">
              Natural care
            </span>
            <Sparkles size={22} className="text-acacia" />
          </div>
          <div className="grid grid-cols-3 items-end gap-3">
            <div className="h-16 rounded-t-2xl bg-[#111827] shadow-md" />
            <div className="h-24 rounded-t-2xl bg-[#1f2937] shadow-md" />
            <div className="h-20 rounded-t-2xl bg-[#374151] shadow-md" />
          </div>
          <p className="text-sm font-black text-walnut">{storeName}</p>
        </div>
      </div>
    );
  }

  if (type === "leather") {
    return (
      <div className="col-span-2 row-span-2 overflow-hidden bg-gradient-to-br from-amber-100 via-orange-50 to-white p-4">
        <div className="grid h-full grid-cols-[1.1fr_0.9fr] gap-3">
          <div className="rounded-2xl bg-[#7c3f16] p-4 text-white shadow-md">
            <ShoppingBag className="mb-8" size={30} />
            <p className="text-xs font-bold uppercase tracking-wide text-white/70">
              Handcrafted
            </p>
            <p className="mt-1 text-lg font-black leading-tight">
              Leather goods
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex h-20 items-center justify-center rounded-2xl bg-[#a16207] text-white shadow-sm">
              <Watch size={30} />
            </div>
            <div className="flex h-20 items-center justify-center rounded-2xl bg-white text-[#7c3f16] shadow-sm">
              <Scissors size={30} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="col-span-2 row-span-2 overflow-hidden bg-gradient-to-br from-blue-100 via-white to-slate-100 p-4">
      <div className="flex h-full flex-col justify-between rounded-2xl border border-white/70 bg-white/60 p-4 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-terracotta px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white">
            Business catalog
          </span>
          <BriefcaseBusiness size={24} className="text-terracotta" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex aspect-square items-center justify-center rounded-2xl bg-white text-terracotta shadow-sm">
            <Package size={28} />
          </div>
          <div className="flex aspect-square items-center justify-center rounded-2xl bg-acacia-soft text-acacia shadow-sm">
            <ShoppingBag size={28} />
          </div>
          <div className="flex aspect-square items-center justify-center rounded-2xl bg-terracotta-soft text-terracotta shadow-sm">
            <BriefcaseBusiness size={28} />
          </div>
        </div>
        <p className="text-sm font-black text-walnut">{storeName}</p>
      </div>
    </div>
  );
}
