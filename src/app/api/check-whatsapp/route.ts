import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { normalizeNamibianPhone } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const start = Date.now();

  // Require authentication
  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ exists: false, blocked: false });
  }

  const body = await req.json().catch(() => null);
  const phone = body?.phone;

  if (!phone || typeof phone !== "string" || phone.length < 7) {
    return NextResponse.json({ exists: false, blocked: false });
  }

  const normalized = normalizeNamibianPhone(phone);
  const supabase = createServiceClient();

  // Find any merchant with this WhatsApp number
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("whatsapp_number", normalized)
    .limit(1)
    .single();

  if (!merchant) {
    // Consistent response time
    const elapsed = Date.now() - start;
    if (elapsed < 200) {
      await new Promise((r) => setTimeout(r, 200 - elapsed));
    }
    return NextResponse.json({ exists: false, blocked: false });
  }

  // Check subscription tier
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("tier")
    .eq("merchant_id", merchant.id)
    .limit(1)
    .single();

  // No subscription or oshi_start = free tier = blocked
  const isFree = !subscription || subscription.tier === "oshi_start";

  // Consistent response time
  const elapsed = Date.now() - start;
  if (elapsed < 200) {
    await new Promise((r) => setTimeout(r, 200 - elapsed));
  }

  return NextResponse.json({
    exists: true,
    blocked: isFree,
  });
}
