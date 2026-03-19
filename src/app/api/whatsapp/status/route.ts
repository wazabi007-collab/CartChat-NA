import { NextResponse } from "next/server";
import { isWhatsAppEnabled } from "@/lib/whatsapp";

/** GET /api/whatsapp/status — returns whether WhatsApp Business API is active */
export async function GET() {
  return NextResponse.json({ enabled: isWhatsAppEnabled() });
}
