import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  const merchantId = req.nextUrl.searchParams.get("merchant_id");
  const whatsapp = req.nextUrl.searchParams.get("whatsapp");

  if (!merchantId || !whatsapp) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  // Validate phone has at least 8 digits
  const digits = whatsapp.replace(/\D/g, "");
  if (digits.length < 8) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Verify merchant exists
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("id", merchantId)
    .eq("store_status", "active")
    .single();

  if (!merchant) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  // Removed payment_reference and proof_of_payment_url from select (sensitive)
  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, subtotal_nad, delivery_fee_nad, discount_nad, delivery_method, payment_method, created_at, order_items(product_name, quantity, line_total)"
    )
    .eq("merchant_id", merchantId)
    .eq("customer_whatsapp", digits)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }

  return NextResponse.json({ orders: orders || [] });
}
