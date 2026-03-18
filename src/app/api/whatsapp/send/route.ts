import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendWhatsAppTemplate, isWhatsAppEnabled } from "@/lib/whatsapp";

/**
 * Internal API: Send a WhatsApp template message.
 * Called by other server-side code (order-actions, checkout, setup).
 * Not publicly accessible — no auth header needed since it's fire-and-forget from client.
 */
export async function POST(req: NextRequest) {
  if (!isWhatsAppEnabled()) {
    return NextResponse.json({ ok: false, reason: "disabled" });
  }

  try {
    const body = await req.json();
    const {
      merchant_id,
      order_id,
      template_name,
      recipient_phone,
      variables,
    } = body as {
      merchant_id: string;
      order_id?: string;
      template_name: string;
      recipient_phone: string;
      variables: string[];
    };

    if (!template_name || !recipient_phone || !variables) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Log message as queued
    const { data: logRow } = await supabase
      .from("whatsapp_messages")
      .insert({
        merchant_id: merchant_id || null,
        order_id: order_id || null,
        template_name,
        recipient_phone,
        variables,
        status: "queued",
      })
      .select("id")
      .single();

    // Send via Meta Cloud API
    const result = await sendWhatsAppTemplate(
      recipient_phone,
      template_name,
      variables
    );

    // Update log with result
    if (logRow?.id) {
      if (result.success) {
        await supabase
          .from("whatsapp_messages")
          .update({
            status: "sent",
            meta_message_id: result.messageId,
            sent_at: new Date().toISOString(),
          })
          .eq("id", logRow.id);
      } else {
        await supabase
          .from("whatsapp_messages")
          .update({
            status: "failed",
            error_message: result.error,
          })
          .eq("id", logRow.id);
      }
    }

    return NextResponse.json({ ok: result.success, error: result.error });
  } catch (err) {
    console.error("[WhatsApp Send]", err);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
