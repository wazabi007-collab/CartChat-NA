import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Store, Search, ArrowRight, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Browse Stores | ${SITE_NAME}`,
  description:
    "Discover Namibian businesses on OshiCart. Browse stores, shop products, and order via WhatsApp.",
};

export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  // Fetch all active merchants with their product count
  let query = supabase
    .from("merchants")
    .select("id, store_name, store_slug, description, logo_url, whatsapp_number, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (q && q.trim()) {
    query = query.or(
      `store_name.ilike.%${q.trim()}%,description.ilike.%${q.trim()}%`
    );
  }

  const { data: merchants } = await query;
  const storeList = merchants || [];

  // Fetch product counts for each merchant
  const merchantIds = storeList.map((m) => m.id);
  const { data: productCounts } = merchantIds.length > 0
    ? await supabase
        .from("products")
        .select("merchant_id")
        .in("merchant_id", merchantIds)
        .eq("is_available", true)
    : { data: [] };

  const countMap = new Map<string, number>();
  for (const p of productCounts || []) {
    countMap.set(p.merchant_id, (countMap.get(p.merchant_id) || 0) + 1);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <Image src="/logo.svg" alt={SITE_NAME} width={140} height={37} />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-sm px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Create Store
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Page Title & Search */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Browse Namibian Stores
          </h1>
          <p className="text-gray-500 mt-2">
            Discover local businesses and shop directly via WhatsApp
          </p>
        </div>

        {/* Search Bar */}
        <form action="/stores" method="GET" className="max-w-lg mx-auto mb-10">
          <div className="relative">
            <Search
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              name="q"
              defaultValue={q || ""}
              placeholder="Search stores by name..."
              className="w-full pl-10 pr-4 py-3 border rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </form>

        {/* Results */}
        {q && (
          <p className="text-sm text-gray-500 mb-4">
            {storeList.length} result{storeList.length !== 1 ? "s" : ""} for
            &ldquo;{q}&rdquo;
          </p>
        )}

        {storeList.length === 0 ? (
          <div className="bg-white rounded-lg border p-12 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Store size={32} className="text-gray-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {q ? "No stores found" : "No stores yet"}
            </h2>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              {q
                ? `No stores matching "${q}". Try a different search.`
                : "Be the first to create a store on OshiCart!"}
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors font-medium"
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
                  className="bg-white rounded-lg border hover:shadow-md transition-shadow overflow-hidden group"
                >
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      {merchant.logo_url ? (
                        <img
                          src={merchant.logo_url}
                          alt={merchant.store_name}
                          className="w-12 h-12 rounded-full object-cover border"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-green-700 font-bold text-lg">
                            {merchant.store_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 truncate group-hover:text-green-600 transition-colors">
                          {merchant.store_name}
                        </h3>
                        <p className="text-xs text-gray-400">
                          {productCount} product{productCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>

                    {merchant.description && (
                      <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                        {merchant.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t">
                      <span className="inline-flex items-center gap-1 text-xs text-green-600">
                        <MessageCircle size={14} />
                        WhatsApp Store
                      </span>
                      <span className="text-xs text-gray-400 group-hover:text-green-600 transition-colors flex items-center gap-1">
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
        <div className="mt-12 text-center bg-white rounded-lg border p-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Own a business in Namibia?
          </h3>
          <p className="text-gray-500 text-sm mb-4">
            Create your free WhatsApp store in 5 minutes and reach more
            customers.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
          >
            Create Free Store <ArrowRight size={16} />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-8">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <p>{SITE_NAME} — Made in Namibia</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-gray-600">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-gray-600">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
