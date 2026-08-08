import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * The appointment times already booked for a merchant on a given day.
 *
 * Checkout uses this to grey out taken slots before the customer picks one.
 * That is a courtesy, not the guarantee — place_order rejects a taken slot
 * under an advisory lock, so two simultaneous customers cannot both book it.
 *
 * Public and PII-free by design: it returns only time strings, never who
 * booked them. Only orders that actually contain a service block a slot; a
 * bread delivery in the same window is a broad window, not a chair.
 */
export async function GET(request: NextRequest) {
  const merchantId = request.nextUrl.searchParams.get("merchant");
  const date = request.nextUrl.searchParams.get("date");

  if (!merchantId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ taken: [] });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("orders")
    .select("delivery_time, order_items!inner(products!inner(item_type))")
    .eq("merchant_id", merchantId)
    .eq("delivery_date", date)
    .neq("status", "cancelled")
    .eq("order_items.products.item_type", "service")
    .not("delivery_time", "is", null);

  if (error) {
    // Fail open: the picker shows every slot and place_order still rejects
    // a genuine conflict, which beats blocking the whole booking flow.
    return NextResponse.json({ taken: [] });
  }

  const taken = [...new Set((data ?? []).map((row) => row.delivery_time).filter(Boolean))];
  return NextResponse.json(
    { taken },
    { headers: { "Cache-Control": "no-store" } }
  );
}
