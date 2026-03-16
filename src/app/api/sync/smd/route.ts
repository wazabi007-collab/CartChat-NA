import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import sharp from "sharp";

const SMD_BASE = "http://api.smdtechnologies.com/v1";
const SMD_TOKEN = process.env.SMD_BEARER_TOKEN || "";
const SMD_KEY = process.env.SMD_CLIENT_ACCESS_KEY || "";

// Octovia Nexus merchant ID
const TARGET_MERCHANT_ID = process.env.SMD_MERCHANT_ID || "6c49bff7-789d-464e-ab89-8314acb72107";
const TARGET_USER_ID = process.env.SMD_USER_ID || "e4a7a088-19c8-4fa9-b37d-19c8781d8907";

// Markup rules
function applyMarkup(priceExcl: number): number {
  if (priceExcl < 500) return Math.round(priceExcl * 1.46 * 100); // 46% markup, convert to cents
  return Math.round(priceExcl * 1.36 * 100); // 36% markup, convert to cents
}

// Fetch all pages from an SMD endpoint
async function fetchAllPages(endpoint: string): Promise<Record<string, unknown>[]> {
  const headers = {
    Authorization: `Bearer ${SMD_TOKEN}`,
    ClientAccessKey: SMD_KEY,
  };

  // Get first page to know total pages
  const firstRes = await fetch(`${SMD_BASE}/${endpoint}?page=1`, { headers });
  if (!firstRes.ok) throw new Error(`SMD ${endpoint} failed: ${firstRes.status}`);
  const firstJson = await firstRes.json();
  const totalPages = firstJson.numberOfPages || firstJson.numberOfPage || 1;
  const allData: Record<string, unknown>[] = [...(firstJson.data || [])];

  // Fetch remaining pages
  for (let page = 2; page <= totalPages; page++) {
    const res = await fetch(`${SMD_BASE}/${endpoint}?page=${page}`, { headers });
    if (res.ok) {
      const json = await res.json();
      allData.push(...(json.data || []));
    }
  }

  return allData;
}

// Download and compress image via Sharp
async function processImage(
  url: string,
  supabase: ReturnType<typeof createServiceClient>,
  storagePath: string
): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    let quality = 80;
    let processed = await sharp(buffer)
      .resize(800, undefined, { withoutEnlargement: true, fit: "inside" })
      .webp({ quality })
      .toBuffer();

    while (processed.length > 100 * 1024 && quality > 20) {
      quality -= 10;
      processed = await sharp(buffer)
        .resize(800, undefined, { withoutEnlargement: true, fit: "inside" })
        .webp({ quality })
        .toBuffer();
    }

    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
    const fullPath = `${storagePath}/${fileName}`;

    const { error } = await supabase.storage
      .from("merchant-assets")
      .upload(fullPath, processed, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: false,
      });

    if (error) return null;

    const { data: { publicUrl } } = supabase.storage.from("merchant-assets").getPublicUrl(fullPath);
    return publicUrl;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  // Auth: admin only or CRON_SECRET (timing-safe comparison)
  const cronSecret = request.headers.get("x-cron-secret") || "";
  const expectedSecret = process.env.CRON_SECRET || "";
  const isValidCron = expectedSecret.length >= 16 && cronSecret.length > 0 &&
    cronSecret.length === expectedSecret.length &&
    crypto.timingSafeEqual(Buffer.from(cronSecret), Buffer.from(expectedSecret));
  if (!isValidCron) {
    const admin = await getAuthenticatedAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (!SMD_TOKEN || !SMD_KEY) {
    return NextResponse.json({ error: "SMD credentials not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const dryRun = searchParams.get("dry_run") === "true";
  const skipImages = searchParams.get("skip_images") === "true";
  const maxProducts = parseInt(searchParams.get("max") || "0") || 0;

  try {
    // Fetch all data from SMD
    const [products, prices, stock, media] = await Promise.all([
      fetchAllPages("products"),
      fetchAllPages("prices"),
      fetchAllPages("stock"),
      fetchAllPages("media"),
    ]);

    // Build lookup maps by SKU
    const priceMap = new Map<string, { priceExcl: number; specialExcl: number }>();
    for (const p of prices) {
      const excl = parseFloat(p.PriceExcl as string) || 0;
      const specialExcl = parseFloat(p.SpecialPriceExcl as string) || 0;
      priceMap.set(p.Sku as string, { priceExcl: excl, specialExcl });
    }

    const stockMap = new Map<string, number>();
    for (const s of stock) {
      stockMap.set(s.Sku as string, (s.SOH as number) || 0);
    }

    // Group media by SKU, sorted by OrderWeight, max 3 images
    const mediaMap = new Map<string, string[]>();
    const mediaSorted = [...media].sort(
      (a, b) => ((a.OrderWeight as number) || 0) - ((b.OrderWeight as number) || 0)
    );
    for (const m of mediaSorted) {
      const sku = m.Sku as string;
      if (!mediaMap.has(sku)) mediaMap.set(sku, []);
      const urls = mediaMap.get(sku)!;
      if (urls.length < 3 && m.Type === "Image") {
        urls.push(m.Url as string);
      }
    }

    // Merge into product records
    const merged = products.map((p) => {
      const sku = p.Sku as string;
      const price = priceMap.get(sku);
      const soh = stockMap.get(sku) ?? 0;
      const images = mediaMap.get(sku) || [];

      // Use special price if available, otherwise regular price
      const basePrice = (price?.specialExcl && price.specialExcl > 0)
        ? price.specialExcl
        : (price?.priceExcl || 0);

      const priceNad = applyMarkup(basePrice);

      return {
        sku,
        name: (p.Name as string || "").slice(0, 100),
        description: (p.ShortDescription as string) || null,
        category: (p.Category as string) || null,
        brand: (p.Brand as string) || null,
        type: (p.Type as string) || null,
        priceNad,
        basePrice,
        soh,
        imageUrls: images,
      };
    }).filter((p) => p.priceNad > 0); // Skip products with no price

    const toSync = maxProducts > 0 ? merged.slice(0, maxProducts) : merged;

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        totalProducts: products.length,
        totalPrices: prices.length,
        totalStock: stock.length,
        totalMedia: media.length,
        toSync: toSync.length,
        sample: toSync.slice(0, 5).map((p) => ({
          sku: p.sku,
          name: p.name,
          basePrice: `N$${p.basePrice.toFixed(2)}`,
          markup: p.basePrice < 500 ? "46%" : "36%",
          finalPrice: `N$${(p.priceNad / 100).toFixed(2)}`,
          stock: p.soh,
          images: p.imageUrls.length,
        })),
      });
    }

    // Sync to database
    const service = createServiceClient();
    let created = 0;
    let updated = 0;
    let imagesSynced = 0;
    const errors: string[] = [];

    for (const product of toSync) {
      try {
        // Check if product exists by SKU
        const { data: existing } = await service
          .from("products")
          .select("id, images")
          .eq("merchant_id", TARGET_MERCHANT_ID)
          .eq("sku", product.sku)
          .is("deleted_at", null)
          .single();

        // Process images if needed
        const imageUrls: string[] = existing?.images || [];
        if (!skipImages && product.imageUrls.length > 0 && imageUrls.length === 0) {
          for (const url of product.imageUrls) {
            const compressed = await processImage(
              url,
              service,
              `${TARGET_USER_ID}/products`
            );
            if (compressed) {
              imageUrls.push(compressed);
              imagesSynced++;
            }
          }
        }

        const productData = {
          merchant_id: TARGET_MERCHANT_ID,
          name: product.name,
          description: product.description,
          price_nad: product.priceNad,
          sku: product.sku,
          is_available: product.soh > 0,
          track_inventory: true,
          stock_quantity: product.soh,
          low_stock_threshold: 5,
          allow_backorder: false,
          images: imageUrls,
        };

        if (existing) {
          // Update existing product
          await service
            .from("products")
            .update({
              name: productData.name,
              description: productData.description,
              price_nad: productData.price_nad,
              is_available: productData.is_available,
              stock_quantity: productData.stock_quantity,
              images: imageUrls,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
          updated++;
        } else {
          // Create new product
          await service.from("products").insert(productData);
          created++;
        }
      } catch (err) {
        errors.push(`${product.sku}: ${err instanceof Error ? err.message : "unknown error"}`);
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      imagesSynced,
      total: toSync.length,
      errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}

// GET: check sync status
export async function GET() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const service = createServiceClient();
  const { count } = await service
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("merchant_id", TARGET_MERCHANT_ID)
    .not("sku", "is", null)
    .is("deleted_at", null);

  return NextResponse.json({
    syncedProducts: count || 0,
    merchantId: TARGET_MERCHANT_ID,
    smdConfigured: !!(SMD_TOKEN && SMD_KEY),
  });
}
