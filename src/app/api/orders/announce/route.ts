import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { formatPrice } from "@/lib/utils";
import { getOrderPayableTotal } from "@/lib/vat";
import { sendWhatsAppEvent } from "@/lib/whatsapp-events";
import { getPaymentMethodLabel } from "@/lib/constants";

/**
 * Sends the post-checkout WhatsApp notifications (new-order alert to the
 * merchant + order-placed confirmation to the customer) for a freshly placed
 * order.
 *
 * Anonymous customers place orders, so this cannot require a session. Instead
 * it is gated by the order's tracking_token — a capability returned only to
 * the buyer by place_order. Crucially, every recipient phone and template
 * variable is derived SERVER-SIDE from the order row; nothing is taken from
 * the request body except the (order_id, tracking_token) pair. Replays are
 * idempotent via the per-message event_key. This replaces the previous
 * unauthenticated /api/whatsapp/send calls from the browser.
 */
export async function POST(req: NextRequest) {
  let body: { order_id?: string; tracking_token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const { order_id, tracking_token } = body;
  if (!order_id || !tracking_token) {
    return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
  }

  const service = createServiceClient();

  // The tracking_token must match the order — this is the buyer's capability.
  const { data: order } = await service
    .from("orders")
    .select(`
      id, order_number, customer_name, customer_whatsapp,
      subtotal_nad, delivery_fee_nad, discount_nad, vat_nad, vat_inclusive, payment_method,
      delivery_method, delivery_provider,
      merchant_id, tracking_token,
      merchants!inner(store_name, whatsapp_number),
      order_items(product_name, quantity, variant_attributes)
    `)
    .eq("id", order_id)
    .eq("tracking_token", tracking_token)
    .single();

  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }

  const merchant = order.merchants as unknown as { store_name: string; whatsapp_number: string | null };
  const items = (order.order_items || []) as Array<{ product_name: string; quantity: number; variant_attributes: Record<string, string> | null }>;

  const total = getOrderPayableTotal(order);
  const itemSummary =
    items.length === 1
      ? `${items[0].product_name} x${items[0].quantity}`
      : `${items.length} items`;
  const paymentLabel = getPaymentMethodLabel(order.payment_method);

  // Delivery line for the merchant alert. Yango/inDrive are buyer-paid couriers
  // — the merchant only prepares the parcel, so make that explicit.
  const deliveryProviderLabel: Record<string, string> = {
    store: "Store delivery",
    yango: "Yango (buyer books & pays courier)",
    indrive: "inDrive (buyer books & pays courier)",
  };
  const deliveryLine =
    order.delivery_method === "delivery"
      ? deliveryProviderLabel[order.delivery_provider ?? "store"] ?? "Store delivery"
      : "Pickup";

  // Merchant alert
  await sendWhatsAppEvent({
    supabase: service,
    merchantId: order.merchant_id,
    orderId: order.id,
    eventKey: `new_order_merchant:${order.id}`,
    templateName: "new_order_merchant",
    recipientPhone: merchant.whatsapp_number,
    variables: [
      String(order.order_number),
      order.customer_name || "Customer",
      itemSummary,
      formatPrice(total),
      paymentLabel,
      deliveryLine,
    ],
  });

  // Customer confirmation
  await sendWhatsAppEvent({
    supabase: service,
    merchantId: order.merchant_id,
    orderId: order.id,
    eventKey: `order_placed:${order.id}`,
    templateName: "order_placed",
    recipientPhone: order.customer_whatsapp,
    variables: [
      order.customer_name || "Customer",
      String(order.order_number),
      merchant.store_name,
      formatPrice(total),
    ],
    buttonParams: [order.tracking_token ?? ""],
  });

  // The buyer completed the purchase, so close any open abandoned-checkout row
  // for this (store, phone). Without this the cron would chase someone who has
  // already ordered. Runs on every order, so recovery state stays accurate.
  if (order.customer_whatsapp) {
    await service
      .from("abandoned_checkouts")
      .update({
        recovered_at: new Date().toISOString(),
        recovered_order_id: order.id,
      })
      .eq("merchant_id", order.merchant_id)
      .eq("customer_whatsapp", order.customer_whatsapp)
      .is("recovered_at", null);
  }

  return NextResponse.json({ ok: true });
}
