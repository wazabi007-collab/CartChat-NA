import { NextResponse } from "next/server";
import { isWhatsAppEnabled } from "@/lib/whatsapp";

/** GET /api/whatsapp/status — returns WhatsApp status for OTP login tab visibility */
export async function GET() {
  // OTP login uses a separate flag so order notifications can stay enabled
  const otpEnabled = isWhatsAppEnabled() && process.env.WHATSAPP_OTP_ENABLED === "true";
  return NextResponse.json({ enabled: otpEnabled });
}
