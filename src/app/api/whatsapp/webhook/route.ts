import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyWebhookSignature, sendWhatsAppTemplate } from "@/lib/whatsapp";
import { adminWhatsAppNumbers } from "@/lib/whatsapp-events";

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
 * Statuses update whatsapp_messages rows. Inbound replies are forwarded to
 * the admin numbers (OSHICART_ADMIN_WHATSAPP_NUMBERS) via the
 * inbound_message_alert template — every automated message invites people to
 * "reply here", and until this existed those replies landed on a business
 * number nobody attends.
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
        // --- Inbound replies: forward to the admins' own phones ----------
        const inbound = change?.value?.messages || [];
        const contacts = change?.value?.contacts || [];
        const admins = adminWhatsAppNumbers();
        for (const message of inbound) {
          const from = message?.from as string | undefined;
          if (!from || admins.length === 0) continue;
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
  }

  // Always return 200 quickly — Meta requires fast response
  return new NextResponse("OK", { status: 200 });
}
