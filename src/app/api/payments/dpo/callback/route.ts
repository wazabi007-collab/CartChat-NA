import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyToken } from "@/lib/dpo";
import { SITE_URL } from "@/lib/constants";

/**
 * GET /api/payments/dpo/callback
 * DPO redirects the customer here after payment attempt.
 * Verifies the transaction and redirects to success or failure page.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const transactionToken = searchParams.get("TransactionToken");
  const companyRef = searchParams.get("CompanyRef"); // Our subscription reference
  const cancelled = searchParams.get("cancelled");
  const slug = searchParams.get("slug");

  // Customer pressed "Back" on DPO page
  if (cancelled === "1") {
    return NextResponse.redirect(
      `${SITE_URL}/pricing/checkout/payment-result?status=cancelled`
    );
  }

  if (!transactionToken) {
    return NextResponse.redirect(
      `${SITE_URL}/pricing/checkout/payment-result?status=error&reason=missing_token`
    );
  }

  try {
    // Verify the payment with DPO
    const result = await verifyToken(transactionToken);

    console.log("[DPO Callback] Verify result:", {
      resultCode: result.resultCode,
      resultExplanation: result.resultExplanation,
      companyRef,
      transactionToken,
    });

    const supabase = createServiceClient();

    if (result.isPaid) {
      // Payment successful — find and activate the subscription
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("id, merchant_id, pending_tier, pending_months")
        .eq("dpo_transaction_token", transactionToken)
        .single();

      if (sub && sub.pending_tier) {
        // Calculate billing period based on months paid
        const months = sub.pending_months || 1;
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + months);

        await supabase
          .from("subscriptions")
          .update({
            tier: sub.pending_tier,
            status: "active",
            current_period_end: periodEnd.toISOString(),
            pending_tier: null,
            pending_months: null,
            payment_reference: companyRef || result.transactionApproval,
            dpo_transaction_token: null,
          })
          .eq("id", sub.id);

        console.log("[DPO Callback] Subscription activated:", {
          merchant_id: sub.merchant_id,
          tier: sub.pending_tier,
          months,
          period_end: periodEnd.toISOString(),
          approval: result.transactionApproval,
        });
      }

      return NextResponse.redirect(
        `${SITE_URL}/pricing/checkout/payment-result?status=success&approval=${result.transactionApproval || ""}`
      );
    }

    // Payment not successful
    const reason = result.isDeclined
      ? "declined"
      : result.isCancelled
      ? "cancelled"
      : result.isPending
      ? "pending"
      : "failed";

    return NextResponse.redirect(
      `${SITE_URL}/pricing/checkout/payment-result?status=${reason}&code=${result.resultCode}`
    );
  } catch (err) {
    console.error("[DPO Callback] Error:", err);
    return NextResponse.redirect(
      `${SITE_URL}/pricing/checkout/payment-result?status=error&reason=verify_failed`
    );
  }
}
