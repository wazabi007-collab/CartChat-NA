import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * How many units of a rental item are free over an inclusive date range.
 *
 * Cosmetic, like the booking APIs: checkout uses it to tell the customer
 * "only 1 left for those dates" before they submit, but place_order re-checks
 * under a per-product advisory lock and is the only enforcement. PII-free —
 * a count, never who hired.
 */
export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get("product");
  const first = request.nextUrl.searchParams.get("first");
  const last = request.nextUrl.searchParams.get("last");

  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (
    !productId || !/^[0-9a-f-]{36}$/.test(productId) ||
    !first || !dateRe.test(first) ||
    !last || !dateRe.test(last) || last < first
  ) {
    return NextResponse.json({ remaining: 0 });
  }

  const service = createServiceClient();

  const { data: product } = await service
    .from("products")
    .select("stock_quantity, item_type, merchants!inner(is_active, store_status)")
    .eq("id", productId)
    .is("deleted_at", null)
    .single();

  const merchant = product?.merchants as unknown as {
    is_active: boolean;
    store_status: string;
  } | null;
  if (
    !product ||
    product.item_type !== "rental" ||
    !merchant?.is_active ||
    merchant.store_status !== "active"
  ) {
    return NextResponse.json({ remaining: 0 });
  }

  // Inclusive last day from the customer becomes an exclusive bound, matching
  // place_order exactly: [first, last+1) overlaps [start, end).
  const endExclusive = new Date(`${last}T00:00:00Z`);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  const endStr = endExclusive.toISOString().slice(0, 10);

  const { data: rows } = await service
    .from("order_items")
    .select("quantity, rental_start, rental_end_exclusive, orders!inner(status)")
    .eq("product_id", productId)
    .not("rental_start", "is", null)
    .lt("rental_start", endStr)
    .gt("rental_end_exclusive", first)
    .neq("orders.status", "cancelled");

  const out = (rows ?? []).reduce((sum, r) => sum + (r.quantity ?? 0), 0);
  const remaining = Math.max(0, (product.stock_quantity ?? 0) - out);

  return NextResponse.json(
    { remaining },
    { headers: { "Cache-Control": "no-store" } }
  );
}
