const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const SMD_BASE = "http://api.smdtechnologies.com/v1";
const HEADERS = {
  Authorization: "Bearer g8p8kan2xkqdndukemg7nci5ob34wy",
  ClientAccessKey: "5fee7e7505b007a329ba33e0e74f5cfc",
};

const SUPABASE_URL = "https://pcseqiaqeiiaiqxqtfmw.supabase.co";
const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const serviceKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim();

const USER_ID = "e4a7a088-19c8-4fa9-b37d-19c8781d8907";
const MERCHANT_ID = "6c49bff7-789d-464e-ab89-8314acb72107";

function applyMarkup(priceExcl) {
  if (priceExcl < 500) return Math.round(priceExcl * 1.46 * 100);
  return Math.round(priceExcl * 1.36 * 100);
}

async function sbFetch(restPath, opts = {}) {
  return fetch(SUPABASE_URL + "/rest/v1/" + restPath, {
    ...opts,
    headers: {
      Authorization: "Bearer " + serviceKey,
      apikey: serviceKey,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
}

async function fetchAllPages(endpoint) {
  const firstRes = await fetch(SMD_BASE + "/" + endpoint + "?page=1", { headers: HEADERS });
  const first = await firstRes.json();
  const total = first.numberOfPages || first.numberOfPage || 1;
  let all = [...(first.data || [])];
  for (let p = 2; p <= total; p++) {
    const res = await fetch(SMD_BASE + "/" + endpoint + "?page=" + p, { headers: HEADERS });
    if (res.ok) {
      const j = await res.json();
      all.push(...(j.data || []));
    }
    if (p % 3 === 0) process.stdout.write("  " + endpoint + " page " + p + "/" + total + "\r");
  }
  console.log("  " + endpoint + ": " + all.length + " items (" + total + " pages)");
  return all;
}

async function processImage(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const compressed = await sharp(buf)
      .resize(800, undefined, { withoutEnlargement: true, fit: "inside" })
      .webp({ quality: 70 })
      .toBuffer();
    const fileName = Date.now() + "-" + Math.random().toString(36).slice(2, 8) + ".webp";
    const storagePath = USER_ID + "/products/" + fileName;
    const uploadRes = await fetch(
      SUPABASE_URL + "/storage/v1/object/merchant-assets/" + storagePath,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + serviceKey,
          "Content-Type": "image/webp",
          "Cache-Control": "31536000",
        },
        body: compressed,
      }
    );
    if (!uploadRes.ok) return null;
    return SUPABASE_URL + "/storage/v1/object/public/merchant-assets/" + storagePath;
  } catch {
    return null;
  }
}

async function run() {
  console.log("=== Full SMD Sync ===");
  console.log("Fetching all data from SMD...");

  const [products, prices, stock, media] = await Promise.all([
    fetchAllPages("products"),
    fetchAllPages("prices"),
    fetchAllPages("stock"),
    fetchAllPages("media"),
  ]);

  // Build maps
  const priceMap = new Map();
  for (const p of prices) {
    const excl = parseFloat(p.PriceExcl) || 0;
    const special = parseFloat(p.SpecialPriceExcl) || 0;
    priceMap.set(p.Sku, { excl, special });
  }
  const stockMap = new Map();
  for (const s of stock) stockMap.set(s.Sku, s.SOH || 0);
  const mediaMap = new Map();
  const mediaSorted = [...media].sort((a, b) => (a.OrderWeight || 0) - (b.OrderWeight || 0));
  for (const m of mediaSorted) {
    if (m.Type !== "Image") continue;
    if (!mediaMap.has(m.Sku)) mediaMap.set(m.Sku, []);
    const urls = mediaMap.get(m.Sku);
    if (urls.length < 3) urls.push(m.Url);
  }

  // Step 1: Create categories
  console.log("\nCreating categories...");
  const categoryNames = new Set();
  for (const p of products) {
    const top = (p.Category || "Uncategorized").split("/")[0];
    categoryNames.add(top);
  }

  const existingCatsRes = await sbFetch("categories?merchant_id=eq." + MERCHANT_ID + "&select=id,name");
  const existingCats = await existingCatsRes.json();
  const catMap = new Map();
  for (const c of existingCats) catMap.set(c.name, c.id);

  let catOrder = existingCats.length;
  for (const name of categoryNames) {
    if (catMap.has(name)) continue;
    catOrder++;
    const res = await sbFetch("categories", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ merchant_id: MERCHANT_ID, name, sort_order: catOrder }),
    });
    if (res.ok) {
      const [cat] = await res.json();
      catMap.set(name, cat.id);
      console.log("  + Category: " + name);
    }
  }
  console.log("Categories: " + catMap.size + " total");

  // Step 2: Get existing SKUs
  const existingRes = await sbFetch(
    "products?merchant_id=eq." + MERCHANT_ID + "&sku=not.is.null&deleted_at=is.null&select=id,sku,images"
  );
  const existing = await existingRes.json();
  const existingSkuMap = new Map();
  for (const p of existing) existingSkuMap.set(p.sku, { id: p.id, hasImages: p.images && p.images.length > 0 });
  console.log("Existing synced products: " + existingSkuMap.size);

  // Step 3: Sync products
  console.log("\nSyncing products...");
  let created = 0,
    updated = 0,
    skipped = 0,
    imgCount = 0,
    errors = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const sku = p.Sku;
    const price = priceMap.get(sku);
    if (!price) {
      skipped++;
      continue;
    }

    const base = price.special > 0 ? price.special : price.excl;
    if (base <= 0) {
      skipped++;
      continue;
    }

    const soh = stockMap.get(sku) ?? 0;
    const priceNad = applyMarkup(base);
    const topCat = (p.Category || "Uncategorized").split("/")[0];
    const categoryId = catMap.get(topCat) || null;
    const existingProduct = existingSkuMap.get(sku);

    // Process first image for new products or those without images
    let images = [];
    const needsImage = !existingProduct || !existingProduct.hasImages;
    if (needsImage) {
      const urls = mediaMap.get(sku) || [];
      if (urls.length > 0) {
        const img = await processImage(urls[0]);
        if (img) {
          images.push(img);
          imgCount++;
        }
      }
    }

    try {
      if (existingProduct) {
        const updateData = {
          name: (p.Name || "").slice(0, 100),
          description: p.ShortDescription || null,
          price_nad: priceNad,
          stock_quantity: soh,
          is_available: soh > 0,
          category_id: categoryId,
          updated_at: new Date().toISOString(),
        };
        if (images.length > 0) updateData.images = images;
        await sbFetch("products?id=eq." + existingProduct.id, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify(updateData),
        });
        updated++;
      } else {
        const res = await sbFetch("products", {
          method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            merchant_id: MERCHANT_ID,
            name: (p.Name || "").slice(0, 100),
            description: p.ShortDescription || null,
            price_nad: priceNad,
            sku,
            category_id: categoryId,
            is_available: soh > 0,
            track_inventory: true,
            stock_quantity: soh,
            low_stock_threshold: 5,
            allow_backorder: false,
            images,
          }),
        });
        if (res.ok) created++;
        else errors++;
      }
    } catch {
      errors++;
    }

    if ((i + 1) % 100 === 0) {
      console.log(
        "  Progress: " + (i + 1) + "/" + products.length +
        " | Created: " + created + " Updated: " + updated +
        " Images: " + imgCount + " Errors: " + errors
      );
    }
  }

  console.log("\n=== SYNC COMPLETE ===");
  console.log("Created: " + created);
  console.log("Updated: " + updated);
  console.log("Skipped (no price): " + skipped);
  console.log("Images: " + imgCount);
  console.log("Errors: " + errors);
  console.log("Categories: " + catMap.size);
}

run().catch((e) => console.error("FATAL:", e));
