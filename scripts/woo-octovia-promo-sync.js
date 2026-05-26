const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { createClient } = require("@supabase/supabase-js");

const SOURCE_BASE = "https://promo.octovianexus.com";
const STORE_API = `${SOURCE_BASE}/wp-json/wc/store/v1`;
const WOO_API = `${SOURCE_BASE}/wp-json/wc/v3`;
const STORE_NAME = "Octovia Nexus Promo";
const STORE_SLUG = "octovia-nexus-promo";
const STORE_OWNER_EMAIL = "promo@octovianexus.com";
const STORE_WHATSAPP = "+264812384424";
const SUPABASE_URL = "https://pcseqiaqeiiaiqxqtfmw.supabase.co";
const STORAGE_BUCKET = "merchant-assets";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const publish = args.has("--publish");
const skipImages = args.has("--skip-images");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : null;
const concurrencyArg = process.argv.find((arg) => arg.startsWith("--concurrency="));
const concurrency = Math.max(1, Math.min(Number(concurrencyArg?.split("=")[1] || 6), 12));

const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const serviceKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim();
const wooConsumerKey =
  process.env.OCTOVIA_WOO_CONSUMER_KEY ||
  envContent.match(/OCTOVIA_WOO_CONSUMER_KEY=(.+)/)?.[1]?.trim();
const wooConsumerSecret =
  process.env.OCTOVIA_WOO_CONSUMER_SECRET ||
  envContent.match(/OCTOVIA_WOO_CONSUMER_SECRET=(.+)/)?.[1]?.trim();
const useWooRest = Boolean(wooConsumerKey && wooConsumerSecret);

if (!serviceKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function cleanText(value) {
  if (!value) return null;
  return String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8211;/g, "-")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200) || null;
}

function cleanName(value) {
  return cleanText(value)?.slice(0, 140) || "Untitled product";
}

function productPrice(product) {
  if (useWooRest) {
    const price = Number(product.sale_price || product.price || product.regular_price || 0);
    return Number.isFinite(price) && price > 0 ? Math.round(price * 100) : 0;
  }
  const raw = product?.prices?.price;
  const price = Number(raw);
  return Number.isFinite(price) && price > 0 ? Math.round(price) : 0;
}

function apiUrl(pathname) {
  const base = useWooRest ? WOO_API : STORE_API;
  const url = new URL(`${base}${pathname}`);
  if (useWooRest) {
    url.searchParams.set("consumer_key", wooConsumerKey);
    url.searchParams.set("consumer_secret", wooConsumerSecret);
  }
  return url.toString();
}

async function fetchJson(pathname) {
  const res = await fetch(apiUrl(pathname));
  if (!res.ok) {
    throw new Error(`WooCommerce API failed ${res.status}: ${pathname}`);
  }
  return {
    data: await res.json(),
    total: Number(res.headers.get("x-wp-total") || 0),
    pages: Number(res.headers.get("x-wp-totalpages") || 1),
  };
}

async function fetchAll(pathname) {
  const first = await fetchJson(`${pathname}${pathname.includes("?") ? "&" : "?"}per_page=100&page=1`);
  const all = [...first.data];
  for (let page = 2; page <= first.pages; page++) {
    const next = await fetchJson(`${pathname}${pathname.includes("?") ? "&" : "?"}per_page=100&page=${page}`);
    all.push(...next.data);
    if (page % 5 === 0 || page === first.pages) {
      console.log(`  fetched ${pathname} page ${page}/${first.pages}`);
    }
  }
  return { all, total: first.total, pages: first.pages };
}

async function getOwnerUserId() {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const user = data.users.find((item) => item.email?.toLowerCase() === STORE_OWNER_EMAIL);
  if (!user) {
    throw new Error(`No Supabase auth user found for ${STORE_OWNER_EMAIL}`);
  }
  return user.id;
}

async function ensureMerchant(ownerUserId) {
  const existing = await supabase
    .from("merchants")
    .select("id, user_id, store_name, store_slug, store_status")
    .eq("store_slug", STORE_SLUG)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data;

  if (dryRun) {
    return {
      id: "dry-run-merchant",
      user_id: ownerUserId,
      store_name: STORE_NAME,
      store_slug: STORE_SLUG,
      store_status: publish ? "active" : "pending",
    };
  }

  const { data, error } = await supabase
    .from("merchants")
    .insert({
      user_id: ownerUserId,
      store_name: STORE_NAME,
      store_slug: STORE_SLUG,
      description:
        "Promotional gifts, branded corporate merchandise, apparel, display products, hampers, and business gifting in Namibia.",
      whatsapp_number: STORE_WHATSAPP,
      industry: "general_dealer",
      accepted_payment_methods: ["eft", "cod", "dpo"],
      store_status: publish ? "active" : "pending",
      is_active: true,
      prohibited_policy_accepted_at: new Date().toISOString(),
      prohibited_policy_version: "2026-03-25",
    })
    .select("id, user_id, store_name, store_slug, store_status")
    .single();
  if (error) throw error;

  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  await supabase.from("subscriptions").upsert({
    merchant_id: data.id,
    tier: "oshi_pro",
    status: "active",
    current_period_start: new Date().toISOString(),
    current_period_end: periodEnd.toISOString(),
  });

  return data;
}

function topLevelCategory(product, categoryById) {
  for (const category of product.categories || []) {
    let current = categoryById.get(category.id);
    let guard = 0;
    while (current?.parent && guard < 10) {
      current = categoryById.get(current.parent);
      guard++;
    }
    if (current?.name) return cleanName(current.name);
  }
  return "Promotional Products";
}

function productIsAvailable(product) {
  if (!useWooRest) return true;
  if (product.status && product.status !== "publish") return false;
  if (product.stock_status === "outofstock") return false;
  return true;
}

function productStockQuantity(product) {
  if (!useWooRest || !product.manage_stock) return 0;
  const quantity = Number(product.stock_quantity || 0);
  return Number.isFinite(quantity) ? Math.max(0, Math.round(quantity)) : 0;
}

async function ensureCategories(merchantId, categoryNames) {
  if (dryRun) {
    return new Map([...categoryNames].map((name, index) => [name, `dry-run-category-${index}`]));
  }

  const { data: existing, error } = await supabase
    .from("categories")
    .select("id, name")
    .eq("merchant_id", merchantId);
  if (error) throw error;

  const map = new Map((existing || []).map((category) => [category.name, category.id]));
  let sortOrder = map.size;
  for (const name of categoryNames) {
    if (map.has(name)) continue;
    sortOrder++;
    const { data, error: insertError } = await supabase
      .from("categories")
      .insert({ merchant_id: merchantId, name, sort_order: sortOrder })
      .select("id, name")
      .single();
    if (insertError) throw insertError;
    map.set(data.name, data.id);
  }
  return map;
}

async function uploadImage(ownerUserId, product) {
  const sourceUrl = product.images?.[0]?.src;
  if (!sourceUrl || skipImages) return null;

  try {
    const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const webp = await sharp(buffer)
      .resize(900, 900, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    const safeSku = (product.sku || product.id || Date.now()).toString().replace(/[^a-z0-9-]/gi, "-");
    const storagePath = `${ownerUserId}/products/octovia-promo-${safeSku}.webp`;
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, webp, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: true,
      });
    if (error) return null;
    return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${storagePath}`;
  } catch {
    return null;
  }
}

async function syncProducts(merchant, ownerUserId, products, categoryById) {
  const categoryNames = new Set(products.map((product) => topLevelCategory(product, categoryById)));
  const categoryMap = await ensureCategories(merchant.id, categoryNames);

  const { data: existing, error } = dryRun
    ? { data: [], error: null }
    : await supabase
        .from("products")
        .select("id, sku, images")
        .eq("merchant_id", merchant.id)
        .not("sku", "is", null);
  if (error) throw error;

  const existingBySku = new Map((existing || []).map((product) => [product.sku, product]));
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let images = 0;
  let errors = 0;

  async function processProduct(product) {
    const sku = product.sku || `woo-${product.id}`;
    const price = productPrice(product);
    if (!price) {
      skipped++;
      return;
    }

    const existingProduct = existingBySku.get(sku);
    let imageUrl = existingProduct?.images?.[0] || null;
    if (!imageUrl) {
      imageUrl = dryRun ? product.images?.[0]?.src || null : await uploadImage(ownerUserId, product);
      if (imageUrl) images++;
    }

    const categoryName = topLevelCategory(product, categoryById);
    const payload = {
      merchant_id: merchant.id,
      category_id: categoryMap.get(categoryName) || null,
      item_type: "product",
      name: cleanName(product.name),
      description: cleanText(product.short_description || product.description),
      price_nad: price,
      sku,
      images: imageUrl ? [imageUrl] : [],
      is_available: productIsAvailable(product),
      track_inventory: Boolean(useWooRest && product.manage_stock),
      stock_quantity: productStockQuantity(product),
      allow_backorder: !useWooRest || product.backorders_allowed === true || !product.manage_stock,
      moderation_status: "approved",
      moderation_source: "octovia_promo_sync",
      updated_at: new Date().toISOString(),
    };

    if (dryRun) {
      existingProduct ? updated++ : created++;
    } else if (existingProduct) {
      const { error: updateError } = await supabase
        .from("products")
        .update(payload)
        .eq("id", existingProduct.id);
      updateError ? errors++ : updated++;
    } else {
      const { error: insertError } = await supabase.from("products").insert(payload);
      insertError ? errors++ : created++;
    }
  }

  for (let index = 0; index < products.length; index += concurrency) {
    const batch = products.slice(index, index + concurrency);
    await Promise.all(batch.map((product) => processProduct(product)));
    const done = Math.min(index + concurrency, products.length);
    if (done % 100 === 0 || done === products.length) {
      console.log(
        `  products ${done}/${products.length} | created ${created} | updated ${updated} | skipped ${skipped} | images ${images} | errors ${errors}`
      );
    }
  }

  return { created, updated, skipped, images, errors, categories: categoryNames.size };
}

async function main() {
  console.log(`=== Octovia Nexus Promo WooCommerce sync${dryRun ? " (dry run)" : ""} ===`);
  console.log(`Source API: ${useWooRest ? "authenticated WooCommerce REST" : "public WooCommerce Store API"}`);
  const ownerUserId = await getOwnerUserId();
  const merchant = await ensureMerchant(ownerUserId);
  console.log(`Store: ${merchant.store_name} /s/${merchant.store_slug} (${merchant.store_status})`);

  const [{ all: categories }, productFetch] = await Promise.all([
    fetchAll("/products/categories"),
    fetchAll(useWooRest ? "/products?status=publish" : "/products"),
  ]);

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const products = limit ? productFetch.all.slice(0, limit) : productFetch.all;
  console.log(`Source products: ${productFetch.total}; syncing: ${products.length}; source categories: ${categories.length}`);

  const result = await syncProducts(merchant, ownerUserId, products, categoryById);
  console.log("\n=== Sync result ===");
  console.log(JSON.stringify(result, null, 2));
  console.log(`Store URL: https://oshicart.com/s/${STORE_SLUG}`);
}

main().catch((error) => {
  console.error("FATAL:", error);
  process.exit(1);
});
