import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { sendWhatsAppEvent } from "@/lib/whatsapp-events";
import type { WhatsAppTemplateName } from "@/lib/whatsapp-templates";

/**
 * Authenticated merchant-initiated WhatsApp send.
 *
 * Replaces direct browser calls to the (now server-only) /api/whatsapp/send.
 * The caller must be a logged-in merchant, and the message is constrained so a
 * merchant can only message:
 *   - the customer of one of THEIR OWN orders (when order_id is supplied), or
 *   - their own registered WhatsApp number (self-notifications, e.g. setup).
 * This removes the arbitrary-recipient / arbitrary-content abuse vector while
 * preserving the existing dashboard notification flows.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    merchant_id?: string;
    order_id?: string;
    template_name?: string;
    recipient_phone?: string;
    variables?: string[];
    button_params?: string[];
    event_key?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const { merchant_id, order_id, template_name, recipient_phone, variables, button_params, event_key } = body;

  if (!merchant_id || !template_name || !recipient_phone || !variables) {
    return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
  }

  const service = createServiceClient();

  // Verify the caller owns this merchant.
  const { data: merchant } = await service
    .from("merchants")
    .select("id, whatsapp_number")
    .eq("id", merchant_id)
    .eq("user_id", user.id)
    .single();

  if (!merchant) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const normalize = (p: string) => (p || "").replace(/\D/g, "");
  const target = normalize(recipient_phone);
  const merchantPhone = normalize(merchant.whatsapp_number || "");

  if (order_id) {
    // Order-related message: the order must belong to this merchant, and the
    // recipient must be that order's customer (or the merchant themselves).
    const { data: order } = await service
      .from("orders")
      .select("id, customer_whatsapp")
      .eq("id", order_id)
      .eq("merchant_id", merchant_id)
      .single();

    if (!order) {
      return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
    }

    const orderCustomer = normalize(order.customer_whatsapp || "");
    if (target !== orderCustomer && target !== merchantPhone) {
      return NextResponse.json({ ok: false, error: "Recipient not allowed for this order" }, { status: 403 });
    }
  } else if (target !== merchantPhone) {
    // Non-order message must go to the merchant's own number.
    return NextResponse.json({ ok: false, error: "Recipient not allowed" }, { status: 403 });
  }

  const result = await sendWhatsAppEvent({
    supabase: service,
    merchantId: merchant_id,
    orderId: order_id || null,
    eventKey: event_key,
    templateName: template_name as WhatsAppTemplateName,
    recipientPhone: recipient_phone,
    variables,
    buttonParams: button_params,
  });

  return NextResponse.json({ ok: result.ok, skipped: result.skipped, error: result.error });
}
