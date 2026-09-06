import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyWebhookSignature, sendWhatsAppTemplate } from "@/lib/whatsapp";
import { adminWhatsAppNumbers, sendWhatsAppEvent } from "@/lib/whatsapp-events";
import { normalizeNamibianPhone } from "@/lib/utils";

/**
 * GET: Meta webhook verification.
 * Meta sends a GET request with hub.mode, hub.verify_token, hub.challenge.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * Template parameters may not contain newlines, tabs, or runs of 4+ spaces —
 * Meta rejects the send. Collapse to single spaces and cap the length.
 */
function sanitizeForTemplate(text: string, max = 500): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/** What to show for a reply that isn't text. */
const MEDIA_LABELS: Record<string, string> = {
  image: "[photo]",
  video: "[video]",
  audio: "[voice note]",
  document: "[document]",
  sticker: "[sticker]",
  location: "[location]",
  contacts: "[contact card]",
};

/**
 * POST: delivery status updates AND inbound replies from Meta.
 *
 * Statuses update whatsapp_messages rows. Verified, quoted customer replies
 * go to the order's merchant; ambiguous replies retain the admin fallback.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();

  // Verify webhook signature
  const signature = req.headers.get("x-hub-signature-256");
  const valid = await verifyWebhookSignature(body, signature);
  if (!valid) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  try {
    const data = JSON.parse(body);
    const supabase = createServiceClient();

    // Process status updates
    const entries = data?.entry || [];
    for (const entry of entries) {
      const changes = entry?.changes || [];
      for (const change of changes) {
        // --- Inbound replies: resolve merchant ownership before forwarding ---
        const inbound = change?.value?.messages || [];
        const contacts = change?.value?.contacts || [];
        const admins = adminWhatsAppNumbers();
        for (const message of inbound) {
          const from = message?.from as string | undefined;
          if (!from) continue;
          // Loop guard: an admin texting the business number should not be
          // forwarded back to the admins.
          if (admins.some((a) => a.replace(/\D/g, "").endsWith(from.replace(/\D/g, "").slice(-9)))) {
            continue;
          }

          const name =
            contacts.find((c: { wa_id?: string }) => c.wa_id === from)?.profile?.name || "Unknown";
          const text =
            message.type === "text"
              ? sanitizeForTemplate(message.text?.body || "")
              : MEDIA_LABELS[message.type as string] || `[${message.type}]`;
          if (!text) continue;

          // Route quoted replies only when the original recipient and order
          // owner match. A customer's latest order is NOT sufficient context.
          const contextId = message.context?.id;
          if (typeof contextId === "string" && typeof message.id === "string") {
            const { data: original, error } = await supabase.from("whatsapp_messages")
              .select("merchant_id, order_id, recipient_phone, recipient_type")
              .eq("meta_message_id", contextId).maybeSingle();
            if (error) throw new Error("Could not resolve reply context");
            if (original?.merchant_id && original.order_id && original.recipient_type === "customer"
              && normalizeNamibianPhone(original.recipient_phone) === normalizeNamibianPhone(from)) {
              const { data: order, error: orderError } = await supabase.from("orders")
                .select("id").eq("id", original.order_id).eq("merchant_id", original.merchant_id).maybeSingle();
              const { data: merchant, error: merchantError } = await supabase.from("merchants")
                .select("whatsapp_number").eq("id", original.merchant_id).maybeSingle();
              if (orderError || merchantError) throw new Error("Could not verify reply owner");
              if (order && merchant?.whatsapp_number) {
                const result = await sendWhatsAppEvent({
                  supabase, merchantId: original.merchant_id, orderId: original.order_id,
                  eventKey: `inbound_reply:${message.id}`,
                  templateName: "inbound_message_alert", recipientType: "merchant",
                  recipientPhone: merchant.whatsapp_number,
                  variables: [sanitizeForTemplate(name, 100), normalizeNamibianPhone(from), text],
                });
                if (!result.ok) throw new Error("Could not forward merchant reply");
                continue;
              }
            }
          }

          for (const admin of admins) {
            await sendWhatsAppTemplate(admin, "inbound_message_alert", [
              sanitizeForTemplate(name, 100),
              `+${from}`,
              text,
            ]);
          }
        }

        const statuses = change?.value?.statuses || [];
        for (const status of statuses) {
          const messageId = status.id;
          const statusValue = status.status; // sent, delivered, read, failed
          const timestamp = status.timestamp
            ? new Date(parseInt(status.timestamp) * 1000).toISOString()
            : new Date().toISOString();

          if (!messageId) continue;

          const updateData: Record<string, string> = {};

          switch (statusValue) {
            case "sent":
              updateData.status = "sent";
              updateData.sent_at = timestamp;
              break;
            case "delivered":
              updateData.status = "delivered";
              updateData.delivered_at = timestamp;
              break;
            case "read":
              updateData.status = "read";
              updateData.read_at = timestamp;
              break;
            case "failed":
              updateData.status = "failed";
              updateData.error_message =
                status.errors?.[0]?.message || "Delivery failed";
              break;
          }

          if (Object.keys(updateData).length > 0) {
            await supabase
              .from("whatsapp_messages")
              .update(updateData)
              .eq("meta_message_id", messageId);
          }
        }
      }
    }
  } catch (err) {
    console.error("[WhatsApp Webhook]", err);
    return new NextResponse("Please retry", { status: 503 });
  }

  // Acknowledge only successful processing; merchant forwards are idempotent.
  return new NextResponse("OK", { status: 200 });
}
