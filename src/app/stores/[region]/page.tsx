import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Store, ArrowRight, ShieldCheck, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SITE_NAME, SITE_URL, NAMIBIA_REGIONS, REGION_LABELS, TOWNS_NAMIBIA } from "@/lib/constants";
import { fetchStoreListData } from "@/lib/storefront/store-list";
import { PublicNavbar } from "@/components/public-navbar";
import { StoreListCard } from "@/components/storefront/store-list-card";
import { JsonLd } from "@/components/json-ld";

interface Props {
  params: Promise<{ region: string }>;
}

function townNamesFor(region: string): string[] {
  return TOWNS_NAMIBIA.filter((t) => t.region === region && !t.value.endsWith("_other")).map((t) => t.label);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { region } = await params;
  const regionLabel = REGION_LABELS[region];
  if (!regionLabel) return { title: "Region Not Found" };

  const towns = townNamesFor(region);
  const townMention = towns.length > 0 ? ` (${towns.slice(0, 4).join(", ")}${towns.length > 4 ? " and more" : ""})` : "";

  const title = `Shops & Stores in ${regionLabel}, Namibia`;
  const description = `Browse Namibian businesses selling online in the ${regionLabel} region${townMention}. Order via WhatsApp and pay locally — zero commission on ${SITE_NAME}.`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/stores/${region}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/stores/${region}`,
      images: [{ url: `${SITE_URL}/og-default.png`, width: 1200, height: 630 }],
      type: "website",
    },
  };
}

export default async function RegionStoresPage({ params }: Props) {
  const { region } = await params;
  const regionLabel = REGION_LABELS[region];
  if (!regionLabel) notFound();

  const supabase = await createClient();
  const stores = await fetchStoreListData(supabase, { region });
  const towns = townNamesFor(region);

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "OshiCart", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Stores", item: `${SITE_URL}/stores` },
      { "@type": "ListItem", position: 3, name: regionLabel },
    ],
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Stores in ${regionLabel}, Namibia`,
    itemListElement: stores.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/s/${s.store_slug}`,
      name: s.store_name,
    })),
  };

  return (
    <div className="min-h-screen bg-sand">
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={itemListSchema} />
      <PublicNavbar />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {/* Page Title & intro */}
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-acacia-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-acacia">
            <MapPin size={15} />
            {regionLabel} region
          </span>
          <h1 className="text-4xl font-black tracking-tight text-walnut sm:text-5xl">
            Shops & stores in {regionLabel}
          </h1>
          <p className="mt-3 text-base leading-7 text-walnut-2">
            {stores.length > 0
              ? `Discover Namibian businesses selling online in ${regionLabel}${towns.length > 0 ? `, including ${towns.slice(0, 3).join(", ")}` : ""}. Browse products and order directly through WhatsApp — every seller here accepts local payment.`
              : `No stores in ${regionLabel} have listed products yet. Be the first Namibian business in this region to open a free store on ${SITE_NAME}.`}
          </p>
          <p className="mt-4">
            <Link href="/stores" className="inline-flex items-center gap-1 text-sm font-bold text-terracotta hover:underline">
              <ShieldCheck size={15} />
              Browse all Namibian stores &amp; search &rarr;
            </Link>
          </p>
        </div>

        {stores.length === 0 ? (
          <div className="bg-white rounded-lg border border-border-warm p-12 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Store size={32} className="text-walnut-2/70" />
            </div>
            <h2 className="text-lg font-semibold text-walnut mb-2">No stores yet in {regionLabel}</h2>
            <p className="text-walnut-2 mb-6 max-w-sm mx-auto">
              Own a business here? Be the first to list it.
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
            {stores.map((store) => (
              <StoreListCard key={store.id} store={store} />
            ))}
          </div>
        )}

        {/* CTA for merchants */}
        <div className="mt-12 rounded-xl border border-border-warm bg-white p-8 text-center shadow-sm">
          <h3 className="mb-2 text-xl font-black text-walnut">
            Own a business in {regionLabel}?
          </h3>
          <p className="text-walnut-2 text-sm mb-4">
            Create your free WhatsApp store in 5 minutes and reach more
            customers in your region.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-terracotta text-white px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity font-medium text-sm"
          >
            Create Free Store <ArrowRight size={16} />
          </Link>
        </div>

        {/* Other regions — internal links */}
        <div className="mt-10 text-center">
          <p className="mb-3 text-xs font-black uppercase tracking-wide text-walnut-2/70">
            Other regions
          </p>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
            {NAMIBIA_REGIONS.filter((r) => r.value !== region).map((r) => (
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
