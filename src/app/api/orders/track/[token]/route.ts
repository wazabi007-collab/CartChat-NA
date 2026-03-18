import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || token.length < 6) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  const supabase = createServiceClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      id, order_number, status, status_history, created_at,
      customer_name, customer_whatsapp, delivery_method,
      delivery_address, delivery_date, delivery_time, notes,
      subtotal_nad, delivery_fee_nad, discount_nad,
      payment_method, payment_reference, proof_of_payment_url,
      tracking_token,
      merchants!inner(store_name, store_slug, whatsapp_number),
      order_items(id, product_name, product_price, quantity, line_total)
    `)
    .eq("tracking_token", token)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ order });
}
