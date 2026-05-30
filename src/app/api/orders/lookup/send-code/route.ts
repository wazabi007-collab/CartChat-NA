import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendOtpMessage, isWhatsAppEnabled } from "@/lib/whatsapp";
import { normalizeNamibianPhone } from "@/lib/utils";
import { randomInt, createHash } from "crypto";
import { z } from "zod";

/**
 * Sends a one-time code to a customer's WhatsApp number so they can prove
 * possession before viewing order history via /api/orders/lookup.
 *
 * Previously the lookup endpoint returned a customer's full order history for
 * any (public merchant_id, phone) pair with no auth or rate limit — allowing
 * unauthenticated enumeration/harvesting of customer PII. Requiring a code
 * delivered to the number closes that breach.
 *
 * Always returns a generic { ok: true } so callers cannot infer whether a
 * number has any orders (no enumeration).
 */
const schema = z.object({
  whatsapp: z.string().min(7),
});

const RATE_LIMIT_WINDOW_MIN = 10;
const RATE_LIMIT_MAX = 3;
const OTP_EXPIRY_MIN = 5;

function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export async function POST(req: NextRequest) {
  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const parsed = schema.safeParse(parsedBody);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid phone number" }, { status: 400 });
  }

  if (!isWhatsAppEnabled()) {
    return NextResponse.json({ ok: false, error: "Verification is currently unavailable" }, { status: 503 });
  }

  const normalizedPhone = normalizeNamibianPhone(parsed.data.whatsapp);
  const cleanPhone = normalizedPhone.replace(/\D/g, "");
  const supabase = createServiceClient();

  // Per-phone rate limit (mirrors the auth OTP limiter).
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("phone_otp_codes")
    .select("id", { count: "exact", head: true })
    .eq("phone", cleanPhone)
    .gte("created_at", windowStart);

  if ((count ?? 0) >= RATE_LIMIT_MAX) {
    return NextResponse.json({ ok: false, error: "Too many requests. Please wait a few minutes." }, { status: 429 });
  }

  // Invalidate previous unverified codes for this phone.
  await supabase
    .from("phone_otp_codes")
    .update({ verified: true })
    .eq("phone", cleanPhone)
    .eq("verified", false);

  const code = String(randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MIN * 60 * 1000).toISOString();

  const { error: insertError } = await supabase
    .from("phone_otp_codes")
    .insert({ phone: cleanPhone, code_hash: hashOtp(code), expires_at: expiresAt });

  if (insertError) {
    console.error("[Order Lookup OTP] Insert error:", insertError);
    // Generic success to avoid leaking state.
    return NextResponse.json({ ok: true });
  }

  // Fire the WhatsApp code (best-effort; still return generic ok).
  await sendOtpMessage(cleanPhone, code).catch((err) =>
    console.error("[Order Lookup OTP] Send error:", err)
  );

  return NextResponse.json({ ok: true });
}
