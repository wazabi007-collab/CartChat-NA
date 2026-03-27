import { NextResponse } from "next/server";
import { isWhatsAppEnabled } from "@/lib/whatsapp";

/** GET /api/whatsapp/status — returns WhatsApp messaging + OTP status */
export async function GET() {
  const messagingEnabled = isWhatsAppEnabled();
  const otpEnabled = messagingEnabled && process.env.WHATSAPP_OTP_ENABLED === "true";
  return NextResponse.json({ enabled: messagingEnabled, otpEnabled });
}
