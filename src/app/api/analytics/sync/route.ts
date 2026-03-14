import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/analytics/sync — sync orders & revenue into store_analytics
 * Called after order status changes (confirm, complete, place).
 * Body: { merchant_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { merchant_id } = await request.json();
    if (!merchant_id || typeof merchant_id !== "string") {
      return NextResponse.json({ error: "merchant_id required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify authenticated user owns this merchant
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: merchant } = await supabase
      .from("merchants")
      .select("id")
      .eq("id", merchant_id)
      .eq("user_id", user.id)
      .single();
    if (!merchant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const today = new Date().toISOString().split("T")[0];

    // Count today's orders placed (non-cancelled)
    const { count: ordersPlaced } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("merchant_id", merchant_id)
      .gte("created_at", `${today}T00:00:00`)
      .lt("created_at", `${today}T23:59:59.999`);

    // Count today's confirmed/completed orders
    const { count: ordersConfirmed } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("merchant_id", merchant_id)
      .in("status", ["confirmed", "completed"])
      .gte("created_at", `${today}T00:00:00`)
      .lt("created_at", `${today}T23:59:59.999`);

    // Sum today's revenue (from confirmed/completed orders)
    const { data: revenueRows } = await supabase
      .from("orders")
      .select("subtotal_nad, delivery_fee_nad, discount_nad")
      .eq("merchant_id", merchant_id)
      .in("status", ["confirmed", "completed"])
      .gte("created_at", `${today}T00:00:00`)
      .lt("created_at", `${today}T23:59:59.999`);

    const revenue = (revenueRows || []).reduce(
      (sum, o) => sum + (o.subtotal_nad || 0) + (o.delivery_fee_nad || 0) - (o.discount_nad || 0),
      0
    );

    // Upsert into store_analytics
    const { data: existing } = await supabase
      .from("store_analytics")
      .select("id, page_views")
      .eq("merchant_id", merchant_id)
      .eq("date", today)
      .single();

    if (existing) {
      await supabase
        .from("store_analytics")
        .update({
          orders_placed: ordersPlaced || 0,
          orders_confirmed: ordersConfirmed || 0,
          revenue_nad: revenue,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("store_analytics").insert({
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
