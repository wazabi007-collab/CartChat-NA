import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/orders/reorder — rebuild a cart from a previous order.
 *
 * Gated by the order's tracking_token (the buyer's capability), like
 * /api/orders/announce — buyers are anonymous and never sign in.
 *
 * Everything is re-resolved against the CURRENT catalogue rather than replayed
 * from the order:
 *   * prices come from the product/variant today, never the historical price;
 *   * deleted, hidden or out-of-stock lines are dropped and reported back so
 *     the buyer is told what changed instead of silently getting a short order;
 *   * quantities are clamped to available stock where inventory is tracked.
 *
 * Returns the cart items for the client to write into localStorage, plus a list
 * of what could not be added.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const orderId = typeof body?.order_id === "string" ? body.order_id : "";
  const token = typeof body?.tracking_token === "string" ? body.tracking_token : "";

  if (!orderId || !token) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: order } = await service
    .from("orders")
    .select("id, merchant_id, merchants!inner(store_slug, is_active, store_status)")
    .eq("id", orderId)
    .eq("tracking_token", token)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const merchant = order.merchants as unknown as {
    store_slug: string;
    is_active: boolean;
    store_status: string;
  };
  if (!merchant.is_active || merchant.store_status !== "active") {
    return NextResponse.json({ error: "This store is not currently taking orders" }, { status: 409 });
  }

  const { data: items } = await service
    .from("order_items")
    .select("product_id, product_variant_id, product_name, quantity, variant_sku, variant_attributes")
    .eq("order_id", orderId);

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "That order has no items" }, { status: 404 });
  }

  const productIds = [...new Set(items.map((i) => i.product_id).filter(Boolean))] as string[];
  const variantIds = [...new Set(items.map((i) => i.product_variant_id).filter(Boolean))] as string[];

  const [{ data: products }, { data: variants }] = await Promise.all([
    productIds.length
      ? service
          .from("products")
          .select("id, name, price_nad, images, is_available, deleted_at, track_inventory, stock_quantity, allow_backorder, merchant_id")
          .in("id", productIds)
      : Promise.resolve({ data: [] as never[] }),
    variantIds.length
      ? service
          .from("product_variants")
          .select("id, product_id, sku, price_nad, stock_quantity, is_available, attributes")
          .in("id", variantIds)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const productById = new Map((products ?? []).map((p) => [p.id, p]));
  const variantById = new Map((variants ?? []).map((v) => [v.id, v]));

  const cartItems: Array<{
    productId: string;
    variantId: string | null;
    variantSku: string | null;
    variantAttributes: Record<string, string> | undefined;
    name: string;
    price: number;
    quantity: number;
    imageUrl: string | null;
  }> = [];
  const unavailable: string[] = [];

  for (const item of items) {
    const product = item.product_id ? productById.get(item.product_id) : null;

    // Gone, hidden, or belongs to another store now.
    if (
      !product ||
      product.deleted_at ||
      !product.is_available ||
      product.merchant_id !== order.merchant_id
    ) {
      unavailable.push(item.product_name);
      continue;
    }

    let price = product.price_nad as number;
    let stock: number | null = product.track_inventory ? (product.stock_quantity ?? 0) : null;
    let variantSku: string | null = null;
    let variantId: string | null = null;

    if (item.product_variant_id) {
      const variant = variantById.get(item.product_variant_id);
      if (!variant || variant.is_available === false || variant.product_id !== product.id) {
        unavailable.push(item.product_name);
        continue;
      }
      variantId = variant.id;
      variantSku = variant.sku ?? null;
      if (variant.price_nad != null) price = variant.price_nad as number;
      if (product.track_inventory) stock = variant.stock_quantity ?? 0;
    }

    let quantity = Math.max(1, item.quantity || 1);
    if (stock !== null && !product.allow_backorder) {
      if (stock <= 0) {
        unavailable.push(item.product_name);
        continue;
      }
      quantity = Math.min(quantity, stock);
    }

    cartItems.push({
      productId: product.id,
      variantId,
      variantSku,
      variantAttributes:
        (item.variant_attributes as Record<string, string> | null) ?? undefined,
      name: product.name,
      price,
      quantity,
      imageUrl: (product.images as string[] | null)?.[0] ?? null,
    });
  }

  return NextResponse.json({
    ok: true,
    storeSlug: merchant.store_slug,
    items: cartItems,
    unavailable,
  });
}
