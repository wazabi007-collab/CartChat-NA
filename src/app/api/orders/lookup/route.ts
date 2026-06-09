import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { normalizeNamibianPhone } from "@/lib/utils";
import { createHash } from "crypto";

/**
 * Returns a customer's orders for a merchant — ONLY after the caller proves
 * control of the WhatsApp number via a one-time code (sent by
 * /api/orders/lookup/send-code). This closes the previous unauthenticated PII
 * leak where anyone could enumerate order history by (public merchant_id,
 * low-entropy phone).
 *
 * POST body: { merchant_id, whatsapp, code }
 */
const MAX_ATTEMPTS = 5;

function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export async function POST(req: NextRequest) {
  let body: { merchant_id?: string; whatsapp?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { merchant_id: merchantId, whatsapp, code } = body;
  if (!merchantId || !whatsapp || !code) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const inputDigits = whatsapp.replace(/\D/g, "");
  if (inputDigits.length < 8) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  const cleanPhone = normalizeNamibianPhone(whatsapp).replace(/\D/g, "");
  const supabase = createServiceClient();

  // ── 1. Verify the merchant FIRST, before touching the OTP ──────────────────
  // A wrong/inactive merchant_id must never consume a valid code: previously the
  // code was marked verified before this check, so a 404 here burned the code
  // and the retry (with the right merchant_id) failed with 401 invalid/expired.
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("id", merchantId)
    .eq("store_status", "active")
    .single();

  if (!merchant) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  // ── 2. Find the latest unverified, unexpired code for this phone ───────────
  const { data: otp } = await supabase
    .from("phone_otp_codes")
    .select("id, code_hash, attempts, expires_at")
    .eq("phone", cleanPhone)
    .eq("verified", false)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otp) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });
  }

  // Too many wrong guesses → burn the code (intentional anti-brute-force).
  if ((otp.attempts ?? 0) >= MAX_ATTEMPTS) {
    await supabase.from("phone_otp_codes").update({ verified: true }).eq("id", otp.id);
    return NextResponse.json({ error: "Too many attempts. Request a new code." }, { status: 429 });
  }

  // Wrong code → count the failed attempt but do NOT consume the code.
  if (otp.code_hash !== hashOtp(code)) {
    await supabase
      .from("phone_otp_codes")
      .update({ attempts: (otp.attempts ?? 0) + 1 })
      .eq("id", otp.id);
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });
  }

  // ── 3. Code + merchant are valid → fetch the orders ───────────────────────
  // Done BEFORE consuming the code so a DB error here doesn't burn a valid code.
  // Match against both the raw entered digits and the normalized form, since
  // historical orders may be stored in either format.
  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, subtotal_nad, delivery_fee_nad, discount_nad, vat_nad, vat_inclusive, delivery_method, payment_method, payment_reference, proof_of_payment_url, created_at, order_items(product_name, quantity, line_total, variant_sku, variant_attributes)"
    )
    .eq("merchant_id", merchantId)
    .in("customer_whatsapp", Array.from(new Set([inputDigits, cleanPhone])))
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }

  // ── 4. Everything succeeded → consume the code as the final step ──────────
  await supabase.from("phone_otp_codes").update({ verified: true }).eq("id", otp.id);

  return NextResponse.json({ orders: orders || [] });
}
