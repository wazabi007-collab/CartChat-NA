import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { scanTextForProhibitedContent } from "@/lib/safety/prohibited-content";

/**
 * POST /api/reviews — leave a review for a completed order.
 *
 * Verified-purchase only. Buyers never sign in, so authenticity comes from the
 * order's tracking_token: only the person who placed the order has it. That
 * makes it impossible for a merchant to review their own store, or for a
 * competitor to review a store they never bought from.
 *
 * The order must be `completed`, and UNIQUE(order_id) means one review each.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const orderId = typeof body?.order_id === "string" ? body.order_id : "";
  const token = typeof body?.tracking_token === "string" ? body.tracking_token : "";
  const rating = Number(body?.rating);
  const rawComment = typeof body?.comment === "string" ? body.comment.trim() : "";

  if (!orderId || !token) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Please choose a rating from 1 to 5 stars." }, { status: 400 });
  }
  if (rawComment.length > 1000) {
    return NextResponse.json({ error: "Please keep your review under 1000 characters." }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: order } = await service
    .from("orders")
    .select("id, merchant_id, status, customer_name")
    .eq("id", orderId)
    .eq("tracking_token", token)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.status !== "completed") {
    return NextResponse.json(
      { error: "You can leave a review once your order is complete." },
      { status: 409 }
    );
  }

  // Same content rules as product listings — a review is public text too.
  const comment = rawComment || null;
  if (comment) {
    const scan = scanTextForProhibitedContent([comment]);
    if (scan.severity === "block") {
      return NextResponse.json(
        { error: "That review can't be posted. Please remove any inappropriate content." },
        { status: 400 }
      );
    }
  }

  const { error } = await service.from("reviews").insert({
    merchant_id: order.merchant_id,
    order_id: order.id,
    customer_name: order.customer_name || null,
    rating,
    comment,
  });

  if (error) {
    // 23505 = unique violation on order_id
    if (error.code === "23505") {
      return NextResponse.json({ error: "You've already reviewed this order." }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not save your review." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * GET /api/reviews?order_id=&tracking_token= — has this order been reviewed?
 * Lets the tracking page hide the form once a review exists.
 */
export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("order_id") ?? "";
  const token = req.nextUrl.searchParams.get("tracking_token") ?? "";
  if (!orderId || !token) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: order } = await service
    .from("orders")
    .select("id")
    .eq("id", orderId)
    .eq("tracking_token", token)
    .maybeSingle();

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const { data: review } = await service
    .from("reviews")
    .select("rating, comment")
    .eq("order_id", orderId)
    .maybeSingle();

  return NextResponse.json({ reviewed: !!review, review: review ?? null });
}
