import type { MetadataRoute } from "next";
import { createServiceClient } from "@/lib/supabase/service";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://oshicart.com";
  const service = createServiceClient();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/stores`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/terms`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/privacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/signup`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  // Dynamic store pages
  const { data: merchants } = await service
    .from("merchants")
    .select("store_slug, updated_at")
    .eq("is_active", true)
    .eq("store_status", "active");

  const storePages: MetadataRoute.Sitemap = (merchants || []).map((m) => ({
    url: `${siteUrl}/s/${m.store_slug}`,
    lastModified: new Date(m.updated_at),
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...storePages];
}
