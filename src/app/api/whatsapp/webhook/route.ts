import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyWebhookSignature } from "@/lib/whatsapp";

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
 * POST: Receive delivery status updates from Meta.
 * Updates whatsapp_messages rows with sent_at, delivered_at, read_at.
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
