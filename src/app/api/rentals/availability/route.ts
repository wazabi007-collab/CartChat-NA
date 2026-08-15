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
    .select("stock_quantity, item_type, rental_unit, rental_buffer_days, merchants!inner(is_active, store_status)")
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

  // Mirror place_order exactly: 'day' treats the last date as inclusive
  // (+1 for the exclusive bound); 'night' treats it as check-out, already
  // exclusive. The turnaround buffer widens the window on both sides.
  const buffer = product.rental_buffer_days ?? 0;
  const endExclusive = new Date(`${last}T00:00:00Z`);
  if (product.rental_unit !== "night") {
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  }
  endExclusive.setUTCDate(endExclusive.getUTCDate() + buffer);
  const endStr = endExclusive.toISOString().slice(0, 10);
  const firstWide = new Date(`${first}T00:00:00Z`);
  firstWide.setUTCDate(firstWide.getUTCDate() - buffer);
  const firstStr = firstWide.toISOString().slice(0, 10);

  const { data: rows } = await service
    .from("order_items")
    .select("quantity, rental_start, rental_end_exclusive, orders!inner(status)")
    .eq("product_id", productId)
    .not("rental_start", "is", null)
    .lt("rental_start", endStr)
    .gt("rental_end_exclusive", firstStr)
    .neq("orders.status", "cancelled");

  const out = (rows ?? []).reduce((sum, r) => sum + (r.quantity ?? 0), 0);
  const remaining = Math.max(0, (product.stock_quantity ?? 0) - out);

  return NextResponse.json(
    { remaining },
    { headers: { "Cache-Control": "no-store" } }
  );
}
