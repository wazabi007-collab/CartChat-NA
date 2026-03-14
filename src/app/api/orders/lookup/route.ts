import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  const merchantId = req.nextUrl.searchParams.get("merchant_id");
  const whatsapp = req.nextUrl.searchParams.get("whatsapp");

  if (!merchantId || !whatsapp) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  // Normalize: strip spaces, ensure starts with +
  const normalized = whatsapp.replace(/\s+/g, "");

  const supabase = createServiceClient();

  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, subtotal_nad, delivery_fee_nad, discount_nad, delivery_method, payment_reference, created_at, order_items(product_name, quantity, line_total)"
    )
    .eq("merchant_id", merchantId)
    .eq("customer_whatsapp", normalized)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }

  return NextResponse.json({ orders: orders || [] });
}
