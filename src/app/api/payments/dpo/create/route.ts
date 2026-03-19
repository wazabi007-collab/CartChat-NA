import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createToken, isDpoEnabled } from "@/lib/dpo";

/** Discount tiers for multi-month billing */
const MONTH_DISCOUNTS: Record<number, number> = {
  1: 0,
  3: 0,
  6: 10,
  12: 15,
};

const VALID_MONTHS = [1, 3, 6, 12];

/**
 * POST /api/payments/dpo/create
 * Creates a DPO payment token for subscription checkout.
 * Supports multi-month billing (1, 3, 6, 12 months).
 */
export async function POST(req: NextRequest) {
  if (!isDpoEnabled()) {
    return NextResponse.json({ error: "Online payments are not currently available" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { tier, merchant_id, store_name, reference, months = 1 } = body as {
      tier: string;
      merchant_id: string;
      store_name: string;
      reference: string;
      months?: number;
    };

    if (!tier || !merchant_id || !reference) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const billingMonths = VALID_MONTHS.includes(months) ? months : 1;
    const discount = MONTH_DISCOUNTS[billingMonths] || 0;

    // Verify the user is authenticated and owns this merchant
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: merchant } = await supabase
      .from("merchants")
      .select("id, store_name")
      .eq("id", merchant_id)
      .eq("user_id", user.id)
      .single();

    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    // Get tier price
    const { TIER_LIMITS, TIER_LABELS } = await import("@/lib/tier-limits");
    const tierKey = tier as keyof typeof TIER_LIMITS;
    const tierLimit = TIER_LIMITS[tierKey];
    if (!tierLimit || tierLimit.price_nad === 0) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    // Calculate total with discount
    const subtotalCents = tierLimit.price_nad * billingMonths;
    const discountCents = Math.round(subtotalCents * discount / 100);
    const totalCents = subtotalCents - discountCents;

    const tierLabel = TIER_LABELS[tierKey] || tier;
    const monthRef = `${reference}-${billingMonths}M`;

    // Create DPO token
    const result = await createToken({
      orderId: monthRef,
      orderNumber: 0,
      amountCents: totalCents,
      storeName: "OshiCart",
      storeSlug: "",
      customerFirstName: store_name,
      customerEmail: user.email,
      customerPhone: user.phone || undefined,
    });

    if (!result.success) {
      console.error("[DPO Create] Failed:", result.error);
      return NextResponse.json({ error: result.error || "Failed to create payment" }, { status: 500 });
    }

    // Store the DPO token + billing info on the subscription for verification later
    const service = createServiceClient();
    await service
      .from("subscriptions")
      .update({
        dpo_transaction_token: result.transToken,
        pending_months: billingMonths,
      })
      .eq("merchant_id", merchant_id);

    console.log("[DPO Create] Token created:", {
      merchant_id,
      tier: tierLabel,
      months: billingMonths,
      total: totalCents,
      discount,
      transToken: result.transToken,
    });

    return NextResponse.json({
      paymentUrl: result.paymentUrl,
      transToken: result.transToken,
    });
  } catch (err) {
    console.error("[DPO Create] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
