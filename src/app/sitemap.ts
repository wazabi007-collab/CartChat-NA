import type { MetadataRoute } from "next";
import { createServiceClient } from "@/lib/supabase/service";
import { NAMIBIA_REGIONS } from "@/lib/constants";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://oshicart.com";
  const service = createServiceClient();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/stores`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/pricing`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/help`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/guide`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/terms`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/privacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/prohibited-products`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/signup`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  // Region landing pages (one per Namibian region — see /stores/[region])
  const regionPages: MetadataRoute.Sitemap = NAMIBIA_REGIONS.map((r) => ({
    url: `${siteUrl}/stores/${r.value}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  // Dynamic store pages
  const { data: merchants } = await service
    .from("merchants")
    .select("id, store_slug, updated_at")
    .eq("is_active", true)
    .eq("store_status", "active");

  const storePages: MetadataRoute.Sitemap = (merchants || []).map((m) => ({
    url: `${siteUrl}/s/${m.store_slug}`,
    lastModified: new Date(m.updated_at),
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));

  // Dynamic product pages (available products belonging to active stores)
  const merchantSlugById = new Map((merchants || []).map((m) => [m.id, m.store_slug]));
  const merchantIds = (merchants || []).map((m) => m.id);
  let productPages: MetadataRoute.Sitemap = [];
  if (merchantIds.length > 0) {
    const { data: products } = await service
      .from("products")
      .select("id, merchant_id, updated_at")
      .in("merchant_id", merchantIds)
      .eq("is_available", true)
      .is("deleted_at", null);

    productPages = (products || [])
      .map((p) => {
        const slug = merchantSlugById.get(p.merchant_id);
        if (!slug) return null;
        return {
          url: `${siteUrl}/s/${slug}/${p.id}`,
          lastModified: new Date(p.updated_at),
          changeFrequency: "weekly" as const,
          priority: 0.5,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }

  return [...staticPages, ...regionPages, ...storePages, ...productPages];
}
