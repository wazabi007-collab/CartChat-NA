import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { merchant_id, order_number, customer_name, customer_whatsapp, items, subtotal, delivery_fee, discount, total, payment_method, payment_ref, delivery_method, delivery_address, delivery_date, delivery_time, notes } = body;

    if (!merchant_id || !order_number) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const service = createServiceClient();

    // Get merchant info + email
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

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.log("RESEND_API_KEY not set, skipping email");
      return NextResponse.json({ ok: true, email_sent: false, reason: "no_api_key" });
    }

    // Format currency
    const fmt = (cents: number) => `N$${(cents / 100).toFixed(2)}`;

    // Build item rows for HTML email
    const itemRows = (items || [])
      .map((item: { name: string; quantity: number; price: number }) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${item.name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${fmt(item.price * item.quantity)}</td>
        </tr>`
      )
      .join("");

    const htmlEmail = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#2B5EA7;padding:24px;text-align:center;border-radius:12px 12px 0 0;">
          <h1 style="color:white;margin:0;font-size:20px;">New Order #${order_number}</h1>
          <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">${merchant.store_name}</p>
        </div>

        <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:20px;">
            <p style="margin:0;font-size:14px;color:#166534;">
              <strong>Customer:</strong> ${customer_name}<br>
              <strong>WhatsApp:</strong> ${customer_whatsapp}
            </p>
          </div>

          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:8px 12px;text-align:left;font-weight:600;color:#6b7280;">Item</th>
                <th style="padding:8px 12px;text-align:center;font-weight:600;color:#6b7280;">Qty</th>
                <th style="padding:8px 12px;text-align:right;font-weight:600;color:#6b7280;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>

          <div style="margin-top:16px;padding-top:16px;border-top:2px solid #e5e7eb;font-size:14px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span style="color:#6b7280;">Subtotal</span>
              <strong>${fmt(subtotal)}</strong>
            </div>
            ${discount > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:#16a34a;">Discount</span><strong style="color:#16a34a;">-${fmt(discount)}</strong></div>` : ""}
            ${delivery_fee > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:#6b7280;">Delivery Fee</span><strong>${fmt(delivery_fee)}</strong></div>` : ""}
            <div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:16px;">
              <strong>Total</strong>
              <strong style="color:#16a34a;">${fmt(total)}</strong>
            </div>
          </div>

          <div style="margin-top:20px;background:#f9fafb;border-radius:8px;padding:16px;font-size:13px;color:#4b5563;">
            ${payment_ref ? `<p style="margin:0 0 4px;"><strong>Payment Ref:</strong> ${payment_ref}</p>` : ""}
            <p style="margin:0 0 4px;"><strong>Payment:</strong> ${payment_method}</p>
            <p style="margin:0 0 4px;"><strong>Delivery:</strong> ${delivery_method === "delivery" ? `Delivery to ${delivery_address || "N/A"}` : "Pickup"}</p>
            ${delivery_date ? `<p style="margin:0 0 4px;"><strong>Scheduled:</strong> ${delivery_date}${delivery_time ? ` — ${delivery_time}` : ""}</p>` : ""}
            ${notes ? `<p style="margin:0;"><strong>Notes:</strong> ${notes}</p>` : ""}
          </div>

          <div style="margin-top:24px;text-align:center;">
            <a href="https://oshicart.com/dashboard/orders" style="display:inline-block;background:#2B5EA7;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
              View Order in Dashboard
            </a>
          </div>
        </div>

        <div style="text-align:center;padding:16px;font-size:12px;color:#9ca3af;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;background:#f9fafb;">
          OshiCart — The Simplest Way to Sell Online in Namibia
        </div>
      </div>
    `;

    // Send via Resend API
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "OshiCart Orders <onboarding@resend.dev>",
        to: merchantEmail,
        subject: `New Order #${order_number} — ${customer_name}`,
        html: htmlEmail,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("Resend error:", resendRes.status, errText);
      return NextResponse.json({ ok: true, email_sent: false, reason: errText });
    }

    return NextResponse.json({ ok: true, email_sent: true });
  } catch (err) {
    console.error("Notify error:", err);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
