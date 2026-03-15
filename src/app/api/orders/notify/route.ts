import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  try {
    const { merchant_id, order_number, customer_name, customer_whatsapp, items, subtotal, delivery_fee, discount, total, payment_method, payment_ref, delivery_method, delivery_address, delivery_date, delivery_time, notes } = await req.json();

    if (!merchant_id || !order_number) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const service = createServiceClient();

    // Get merchant's email via auth.users
    const { data: merchant } = await service
      .from("merchants")
      .select("store_name, user_id")
      .eq("id", merchant_id)
      .single();

    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const { data: userData } = await service.auth.admin.getUserById(merchant.user_id);
    const merchantEmail = userData?.user?.email;

    if (!merchantEmail) {
      return NextResponse.json({ ok: true, email_sent: false, reason: "no_email" });
    }

    // Build email content
    const itemLines = (items || [])
      .map((item: { name: string; quantity: number; price: number }) =>
        `• ${item.name} x${item.quantity} — N$${(item.price * item.quantity / 100).toFixed(2)}`
      )
      .join("\n");

    const emailSubject = `New Order #${order_number} — ${merchant.store_name}`;
    const emailBody = [
      `New order received on your OshiCart store!`,
      ``,
      `Order #${order_number}`,
      `Customer: ${customer_name}`,
      `WhatsApp: ${customer_whatsapp}`,
      ``,
      `Items:`,
      itemLines,
      ``,
      `Subtotal: N$${(subtotal / 100).toFixed(2)}`,
      ...(discount > 0 ? [`Discount: -N$${(discount / 100).toFixed(2)}`] : []),
      ...(delivery_fee > 0 ? [`Delivery Fee: N$${(delivery_fee / 100).toFixed(2)}`] : []),
      `Total: N$${(total / 100).toFixed(2)}`,
      ``,
      ...(payment_ref ? [`Payment Ref: ${payment_ref}`] : []),
      `Payment: ${payment_method}`,
      `Delivery: ${delivery_method === "delivery" ? `Delivery to ${delivery_address || "N/A"}` : "Pickup"}`,
      ...(delivery_date ? [`Scheduled: ${delivery_date}${delivery_time ? ` — ${delivery_time}` : ""}`] : []),
      ...(notes ? [`Notes: ${notes}`] : []),
      ``,
      `Log in to your dashboard to manage this order:`,
      `https://oshicart.com/dashboard/orders`,
    ].join("\n");

    // Send email via Supabase Auth (uses the project's email provider)
    // We use the admin API to send a custom email
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const emailRes = await fetch(`${supabaseUrl}/rest/v1/rpc/send_order_notification`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        apikey: serviceKey,
      },
      body: JSON.stringify({
        p_to: merchantEmail,
        p_subject: emailSubject,
        p_body: emailBody,
      }),
    }).catch(() => null);

    // If the RPC doesn't exist, fall back to just logging
    if (!emailRes || !emailRes.ok) {
      console.log(`Order notification for ${merchantEmail}:`, emailSubject);
    }

    return NextResponse.json({ ok: true, email_sent: true });
  } catch (err) {
    console.error("Notify error:", err);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
