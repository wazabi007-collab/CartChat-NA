import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { TIER_LIMITS, type SubscriptionTier } from "@/lib/tier-limits";
import { scanTextForProhibitedContent } from "@/lib/safety/prohibited-content";

/**
 * POST /api/products/import — bulk-create products from a parsed CSV.
 *
 * The browser parses and previews the file, but every rule is re-applied here:
 * ownership, the tier product cap, and the prohibited-content scan. A merchant
 * could otherwise post straight to this route and bypass all three.
 *
 * Rows are validated individually — one bad row is reported and skipped rather
 * than failing the whole import.
 */

interface IncomingRow {
  name?: string;
  price_nad?: number;
  description?: string | null;
  category?: string | null;
  stock?: number | null;
  image_url?: string | null;
}

const MAX_ROWS = 500;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const rows: IncomingRow[] = Array.isArray(body?.rows) ? body.rows : [];
  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  }
  if (rows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `Please import at most ${MAX_ROWS} products at a time.` },
      { status: 400 }
    );
  }

  const service = createServiceClient();

  const { data: merchant } = await service
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!merchant) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const [{ data: subscription }, { count: existingCount }] = await Promise.all([
    service.from("subscriptions").select("tier").eq("merchant_id", merchant.id).maybeSingle(),
    service
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("merchant_id", merchant.id),
  ]);

  const tier = (subscription?.tier ?? "oshi_start") as SubscriptionTier;
  const limit = TIER_LIMITS[tier].products;
  const used = existingCount ?? 0;
  const remaining = limit === -1 ? Number.POSITIVE_INFINITY : Math.max(0, limit - used);

  if (remaining <= 0) {
    return NextResponse.json(
      { error: `Your plan allows ${limit} products and you already have ${used}. Upgrade to add more.` },
      { status: 409 }
    );
  }

  // Categories are given by NAME in the CSV; map to existing ones and create
  // any that are new, so a merchant doesn't have to set them up first.
  const { data: existingCategories } = await service
    .from("categories")
    .select("id, name")
    .eq("merchant_id", merchant.id);

  const categoryByName = new Map<string, string>(
    (existingCategories ?? []).map((c) => [String(c.name).trim().toLowerCase(), c.id as string])
  );

  const wantedCategories = [
    ...new Set(
      rows
        .map((r) => (r.category ?? "").trim())
        .filter((c) => c && !categoryByName.has(c.toLowerCase()))
    ),
  ];

  for (const name of wantedCategories) {
    const { data: created } = await service
      .from("categories")
      .insert({ merchant_id: merchant.id, name })
      .select("id, name")
      .single();
    if (created) categoryByName.set(name.toLowerCase(), created.id as string);
  }

  const toInsert: Record<string, unknown>[] = [];
  const skipped: { row: number; name: string; reason: string }[] = [];
  const flaggedForReview: string[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // +1 for header, +1 for 1-based
    const name = (row.name ?? "").trim();

    if (!name) {
      skipped.push({ row: rowNumber, name: "(no name)", reason: "Missing product name" });
      return;
    }
    if (typeof row.price_nad !== "number" || !Number.isFinite(row.price_nad) || row.price_nad < 0) {
      skipped.push({ row: rowNumber, name, reason: "Missing or invalid price" });
      return;
    }
    if (toInsert.length >= remaining) {
      skipped.push({ row: rowNumber, name, reason: "Plan product limit reached" });
      return;
    }

    const description = (row.description ?? "").trim() || null;
    const scan = scanTextForProhibitedContent([name, description]);
    if (scan.severity === "block") {
      skipped.push({ row: rowNumber, name, reason: "Not allowed on OshiCart" });
      return;
    }
    if (scan.severity === "review") flaggedForReview.push(name);

    const categoryName = (row.category ?? "").trim();
    const categoryId = categoryName ? categoryByName.get(categoryName.toLowerCase()) ?? null : null;

    const stock =
      typeof row.stock === "number" && Number.isFinite(row.stock) && row.stock >= 0
        ? Math.floor(row.stock)
        : null;

    const imageUrl = (row.image_url ?? "").trim();
    // Only accept real http(s) URLs — anything else would render as a broken image.
    const images = /^https?:\/\/\S+$/i.test(imageUrl) ? [imageUrl] : [];

    toInsert.push({
      merchant_id: merchant.id,
      item_type: "product",
      name: name.slice(0, 200),
      description,
      price_nad: Math.round(row.price_nad),
      category_id: categoryId,
      is_available: true,
      images,
      track_inventory: stock !== null,
      stock_quantity: stock ?? 0,
      moderation_status: scan.severity === "review" ? "review_required" : "approved",
      moderation_reasons: scan.reasons,
      moderation_categories: scan.categories,
      moderation_checked_at: new Date().toISOString(),
      moderation_source: "client_rules_v1",
    });
  });

  let imported = 0;
  if (toInsert.length > 0) {
    const { data: inserted, error } = await service
      .from("products")
      .insert(toInsert)
      .select("id");
    if (error) {
      return NextResponse.json(
        { error: "Could not save the products. Please check your file and try again." },
        { status: 500 }
      );
    }
    imported = inserted?.length ?? 0;
  }

  return NextResponse.json({
    ok: true,
    imported,
    skipped,
    flaggedForReview: flaggedForReview.length,
    categoriesCreated: wantedCategories.length,
  });
}
