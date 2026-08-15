import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { normalizeNamibianPhone } from "@/lib/utils";
import { timingSafeEqual, createHash } from "crypto";
import { z } from "zod";

const verifySchema = z.object({
  phone: z.string().min(7),
  code: z.string().length(6),
});

const MAX_ATTEMPTS = 5;

function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Phone and 6-digit code required" },
        { status: 400 }
      );
    }

    const { phone, code } = parsed.data;
    const normalizedPhone = normalizeNamibianPhone(phone);
    const cleanPhone = normalizedPhone.replace(/\D/g, "");
    const supabase = createServiceClient();

    // Find the most recent unexpired, unverified OTP for this phone
    const { data: otpRow, error: fetchError } = await supabase
      .from("phone_otp_codes")
      .select("id, code_hash, attempts")
      .eq("phone", cleanPhone)
      .eq("verified", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otpRow) {
      return NextResponse.json(
        { ok: false, error: "Code expired or not found. Request a new one." },
        { status: 400 }
      );
    }

    // Check attempts (brute-force protection)
    if ((otpRow.attempts ?? 0) >= MAX_ATTEMPTS) {
      await supabase
        .from("phone_otp_codes")
        .update({ verified: true })
        .eq("id", otpRow.id);

      return NextResponse.json(
        { ok: false, error: "Too many incorrect attempts. Request a new code." },
        { status: 429 }
      );
    }

    // Increment attempts
    await supabase
      .from("phone_otp_codes")
      .update({ attempts: (otpRow.attempts ?? 0) + 1 })
      .eq("id", otpRow.id);

    // Timing-safe comparison of hashed OTP
    const inputHash = hashOtp(code);
    const storedBuffer = Buffer.from(otpRow.code_hash);
    const inputBuffer = Buffer.from(inputHash);
    if (storedBuffer.length !== inputBuffer.length || !timingSafeEqual(storedBuffer, inputBuffer)) {
      return NextResponse.json(
        { ok: false, error: "Incorrect code. Please try again." },
        { status: 400 }
      );
    }

    // Mark OTP as verified
    await supabase
      .from("phone_otp_codes")
      .update({ verified: true })
      .eq("id", otpRow.id);

    // Find existing user by phone number in merchants table
    // Column is "whatsapp_number" (not "whatsapp")
    const { data: merchant } = await supabase
      .from("merchants")
      .select("user_id, store_name")
      .eq("whatsapp_number", normalizedPhone)
      .single();

    if (!merchant) {
      // No merchant with this phone — fall back to the auth user's metadata.
      // This used to scan a 1000-row page, so a merchant registered past it
      // was told no account existed and could not sign in.
      const { data: matched } = await supabase.rpc("auth_user_lookup_by_phone", {
        p_normalized: normalizedPhone,
        p_raw: cleanPhone,
      });
      const matchedRow = Array.isArray(matched) ? matched[0] : matched;
      const matchedUser = matchedRow
        ? { id: matchedRow.user_id as string, email: matchedRow.email as string | null }
        : null;

      if (!matchedUser) {
        return NextResponse.json({
          ok: true,
          action: "no_account",
          message: "No account found with this WhatsApp number. Please sign up first.",
        });
      }

      // User exists but no merchant — generate magic link for session
      const { data: linkData, error: linkError } =
        await supabase.auth.admin.generateLink({
          type: "magiclink",
          email: matchedUser.email!,
        });

      if (linkError || !linkData) {
        return NextResponse.json(
          { ok: false, error: "Failed to create session" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        action: "verify_redirect",
        token_hash: linkData.properties?.hashed_token,
        email: matchedUser.email,
        has_merchant: false,
      });
    }

    // Merchant found — get their auth user email
    const { data: { user: authUser } } =
      await supabase.auth.admin.getUserById(merchant.user_id);

    if (!authUser?.email) {
      return NextResponse.json(
        { ok: false, error: "Account configuration error" },
        { status: 500 }
      );
    }

    // Generate a magic link to establish session
    // Token is single-use (Supabase enforced) and site is HTTPS-only
    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: authUser.email,
      });

    if (linkError || !linkData) {
      return NextResponse.json(
        { ok: false, error: "Failed to create session" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      action: "verify_redirect",
      token_hash: linkData.properties?.hashed_token,
      email: authUser.email,
      has_merchant: true,
    });
  } catch (err) {
    console.error("[WhatsApp OTP Verify]", err);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
