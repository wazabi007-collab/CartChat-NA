import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendOtpMessage, isWhatsAppEnabled } from "@/lib/whatsapp";
import { normalizeNamibianPhone } from "@/lib/utils";
import { randomInt, createHash } from "crypto";
import { z } from "zod";

const sendSchema = z.object({
  phone: z.string().min(7, "Valid phone number is required"),
});

// Rate limit: max 3 OTP requests per phone per 10 minutes
const RATE_LIMIT_WINDOW_MIN = 10;
const RATE_LIMIT_MAX = 3;
const OTP_EXPIRY_MIN = 5;

function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    if (!isWhatsAppEnabled()) {
      return NextResponse.json(
        { ok: false, error: "WhatsApp login is currently unavailable" },
        { status: 503 }
      );
    }

    const normalizedPhone = normalizeNamibianPhone(parsed.data.phone);
    const cleanPhone = normalizedPhone.replace(/\D/g, "");
    const supabase = createServiceClient();

    // Rate limit check
    const windowStart = new Date(
      Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000
    ).toISOString();

    const { count } = await supabase
      .from("phone_otp_codes")
      .select("id", { count: "exact", head: true })
      .eq("phone", cleanPhone)
      .gte("created_at", windowStart);

    if ((count ?? 0) >= RATE_LIMIT_MAX) {
      return NextResponse.json(
        { ok: false, error: "Too many requests. Please wait a few minutes." },
        { status: 429 }
      );
    }

    // Invalidate any previous unverified OTPs for this phone
    await supabase
      .from("phone_otp_codes")
      .update({ verified: true })
      .eq("phone", cleanPhone)
      .eq("verified", false);

    // Generate 6-digit OTP and hash before storage
    const code = String(randomInt(100000, 999999));
    const codeHash = hashOtp(code);
    const expiresAt = new Date(
      Date.now() + OTP_EXPIRY_MIN * 60 * 1000
    ).toISOString();

    // Store hashed OTP
    const { error: insertError } = await supabase
      .from("phone_otp_codes")
      .insert({ phone: cleanPhone, code_hash: codeHash, expires_at: expiresAt });

    if (insertError) {
      console.error("[WhatsApp OTP] Insert error:", insertError);
      return NextResponse.json(
        { ok: false, error: "Failed to generate code" },
        { status: 500 }
      );
    }

    // Send plaintext code via WhatsApp (user needs to read it)
    const result = await sendOtpMessage(cleanPhone, code);

    if (!result.success) {
      console.error("[WhatsApp OTP] Send failed:", result.error);
      return NextResponse.json(
        { ok: false, error: "Failed to send WhatsApp message. Try email login instead." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[WhatsApp OTP Send]", err);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
