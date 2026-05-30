import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { sendWhatsAppTemplate, isWhatsAppEnabled } from "@/lib/whatsapp";
import { getWhatsAppTemplate, validateWhatsAppTemplatePayload } from "@/lib/whatsapp-templates";

/**
 * Internal, SERVER-ONLY API: Send a WhatsApp template message with a
 * caller-supplied recipient and content.
 *
 * This endpoint sends through the platform's shared WhatsApp Business number,
 * so it must NOT be callable from the browser or by unauthenticated parties
 * (doing so allows arbitrary spam/phishing from the verified sender and risks
 * a Meta ban). It now requires a server-only shared secret. Browser-initiated
 * sends go through the authenticated /api/whatsapp/notify (merchant) and the
 * tracking-token-gated /api/orders/announce (checkout) instead.
 */
function isAuthorizedInternalCall(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const header = req.headers.get("authorization") || "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : header;
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedInternalCall(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

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
      button_params,
      event_key,
    } = body as {
      merchant_id: string;
      order_id?: string;
      template_name: string;
      recipient_phone: string;
      variables: string[];
      button_params?: string[];
      event_key?: string;
    };

    if (!template_name || !recipient_phone || !variables) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const template = getWhatsAppTemplate(template_name);
    const validationError = validateWhatsAppTemplatePayload(
      template_name,
      variables,
      button_params
    );
    if (validationError || !template) {
      return NextResponse.json(
        { ok: false, error: validationError || "Unknown template" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    if (event_key) {
      const { data: existing } = await supabase
        .from("whatsapp_messages")
        .select("id, status")
        .eq("event_key", event_key)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ ok: true, skipped: true });
      }
    }

    // Log message as queued
    const { data: logRow } = await supabase
      .from("whatsapp_messages")
      .insert({
        merchant_id: merchant_id || null,
        order_id: order_id || null,
        event_key: event_key || null,
        template_name,
        recipient_phone,
        recipient_type: template.recipientType,
        category: template.category,
        variables,
        status: "queued",
      })
      .select("id")
      .single();

    // Send via Meta Cloud API
    const result = await sendWhatsAppTemplate(
      recipient_phone,
      template_name,
      variables,
      button_params
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
