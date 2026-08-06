import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getOrderPayableTotal } from "@/lib/vat";
import { namibianDateString } from "@/lib/date";

/**
 * POST /api/analytics/sync — recompute today's orders & revenue into store_analytics.
 *
 * Called both by the merchant dashboard (authenticated) and by the anonymous
 * checkout right after an order is placed. It previously required a session,
 * so the checkout call always 401'd and a day's figures only landed if the
 * merchant happened to open the order the same day.
 *
 * Authorisation accepts either:
 *   a) an authenticated user who owns `merchant_id`, or
 *   b) a valid (order_id, tracking_token) pair belonging to that merchant —
 *      the same buyer capability used by /api/orders/announce.
 *
 * Note this endpoint cannot be used to inject false figures: every number is
 * recomputed server-side from the orders table. Body: { merchant_id, order_id?, tracking_token? }
 */
export async function POST(request: NextRequest) {
  try {
    const { merchant_id, order_id, tracking_token } = await request.json();
    if (!merchant_id || typeof merchant_id !== "string") {
      return NextResponse.json({ error: "merchant_id required" }, { status: 400 });
    }

    const service = createServiceClient();
    let authorised = false;

    // (b) Buyer capability — an order carrying this token must belong to the merchant.
    if (order_id && tracking_token) {
      const { data: order } = await service
        .from("orders")
        .select("id")
        .eq("id", order_id)
        .eq("tracking_token", tracking_token)
        .eq("merchant_id", merchant_id)
        .maybeSingle();
      authorised = !!order;
    }

    // (a) Merchant session.
    if (!authorised) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const { data: merchant } = await service
        .from("merchants")
        .select("id")
        .eq("id", merchant_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!merchant) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      authorised = true;
    }

    // Namibian calendar day (UTC+2) — using UTC put late-evening orders on the wrong day.
    const today = namibianDateString();
    const dayStart = `${today}T00:00:00+02:00`;
    const dayEnd = `${today}T23:59:59.999+02:00`;

    const { count: ordersPlaced } = await service
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("merchant_id", merchant_id)
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd);

    const { count: ordersConfirmed } = await service
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("merchant_id", merchant_id)
      .in("status", ["confirmed", "completed"])
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd);

    const { data: revenueRows } = await service
      .from("orders")
      .select("subtotal_nad, delivery_fee_nad, discount_nad, vat_nad, vat_inclusive")
      .eq("merchant_id", merchant_id)
      .in("status", ["confirmed", "completed"])
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd);

    const revenue = (revenueRows || []).reduce(
      (sum, o) => sum + getOrderPayableTotal(o),
      0
    );

    const { data: existing } = await service
      .from("store_analytics")
      .select("id")
      .eq("merchant_id", merchant_id)
      .eq("date", today)
      .maybeSingle();

    if (existing) {
      await service
        .from("store_analytics")
        .update({
          orders_placed: ordersPlaced || 0,
          orders_confirmed: ordersConfirmed || 0,
          revenue_nad: revenue,
        })
        .eq("id", existing.id);
    } else {
      await service.from("store_analytics").insert({
        merchant_id,
        date: today,
        page_views: 0,
        orders_placed: ordersPlaced || 0,
        orders_confirmed: ordersConfirmed || 0,
        revenue_nad: revenue,
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
