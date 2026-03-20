import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyToken } from "@/lib/dpo";
import { SITE_URL } from "@/lib/constants";
import { TIER_LABELS } from "@/lib/tier-limits";

/**
 * GET /api/payments/dpo/callback
 * DPO redirects the customer here after payment attempt.
 * Verifies the transaction, activates subscription, sends receipt email.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const transactionToken = searchParams.get("TransactionToken");
  const companyRef = searchParams.get("CompanyRef");
  const cancelled = searchParams.get("cancelled");

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
    const result = await verifyToken(transactionToken);

    console.log("[DPO Callback] Verify result:", {
      resultCode: result.resultCode,
      resultExplanation: result.resultExplanation,
      companyRef,
      transactionToken,
    });

    const supabase = createServiceClient();

    if (result.isPaid) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("id, merchant_id, pending_tier, pending_months")
        .eq("dpo_transaction_token", transactionToken)
        .single();

      if (sub && sub.pending_tier) {
        const months = sub.pending_months || 1;
        const periodStart = new Date();
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

        // Send receipt email (fire-and-forget)
        sendReceiptEmail(supabase, {
          merchantId: sub.merchant_id,
          tier: sub.pending_tier,
          months,
          amountPaid: result.transactionAmount,
          currency: result.transactionCurrency || "NAD",
          approval: result.transactionApproval,
          periodStart,
          periodEnd,
          reference: companyRef || result.transactionApproval,
        }).catch((err) => console.error("[DPO Receipt Email] Error:", err));
      }

      return NextResponse.redirect(
        `${SITE_URL}/pricing/checkout/payment-result?status=success&approval=${result.transactionApproval || ""}`
      );
    }

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

// ─── Receipt email ───────────────────────────────────────────────────────────

interface ReceiptParams {
  merchantId: string;
  tier: string;
  months: number;
  amountPaid: string;
  currency: string;
  approval: string;
  periodStart: Date;
  periodEnd: Date;
  reference: string;
}

async function sendReceiptEmail(
  supabase: ReturnType<typeof createServiceClient>,
  params: ReceiptParams
) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  // Get merchant email
  const { data: merchant } = await supabase
    .from("merchants")
    .select("store_name, user_id")
    .eq("id", params.merchantId)
    .single();

  if (!merchant) return;

  const { data: userData } = await supabase.auth.admin.getUserById(merchant.user_id);
  const email = userData?.user?.email;
  if (!email) return;

  const tierLabel = TIER_LABELS[params.tier as keyof typeof TIER_LABELS] || params.tier;
  const fmtDate = (d: Date) => d.toLocaleDateString("en-NA", { day: "numeric", month: "long", year: "numeric" });

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#2B5EA7;padding:24px;text-align:center;border-radius:12px 12px 0 0;">
        <h1 style="color:white;margin:0;font-size:20px;">Payment Receipt</h1>
        <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">OshiCart Subscription</p>
      </div>

      <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;">
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:20px;text-align:center;">
          <p style="margin:0;font-size:14px;color:#166534;font-weight:600;">Payment Successful</p>
          <p style="margin:4px 0 0;font-size:12px;color:#16a34a;">Your subscription has been activated</p>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr>
            <td style="padding:10px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Store</td>
            <td style="padding:10px 0;text-align:right;font-weight:600;border-bottom:1px solid #f3f4f6;">${merchant.store_name}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Plan</td>
            <td style="padding:10px 0;text-align:right;font-weight:600;border-bottom:1px solid #f3f4f6;">${tierLabel}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Billing Period</td>
            <td style="padding:10px 0;text-align:right;font-weight:600;border-bottom:1px solid #f3f4f6;">${params.months} month${params.months > 1 ? "s" : ""}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Amount Paid</td>
            <td style="padding:10px 0;text-align:right;font-weight:600;color:#16a34a;border-bottom:1px solid #f3f4f6;">${params.currency} ${params.amountPaid}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Payment Reference</td>
            <td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #f3f4f6;">${params.approval}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Activated</td>
            <td style="padding:10px 0;text-align:right;font-weight:600;border-bottom:1px solid #f3f4f6;">${fmtDate(params.periodStart)}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#6b7280;">Renews On</td>
            <td style="padding:10px 0;text-align:right;font-weight:600;">${fmtDate(params.periodEnd)}</td>
          </tr>
        </table>

        <div style="margin-top:24px;text-align:center;">
          <a href="${SITE_URL}/dashboard" style="display:inline-block;background:#2B5EA7;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
            Go to Dashboard
          </a>
        </div>

        <p style="margin-top:20px;font-size:12px;color:#9ca3af;text-align:center;">
          This is your payment confirmation for your OshiCart subscription.
          Keep this email for your records.
        </p>
      </div>

      <div style="text-align:center;padding:16px;font-size:12px;color:#9ca3af;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;background:#f9fafb;">
        OshiCart — The Simplest Way to Sell Online in Namibia<br>
        Octovia Nexus Investment CC · Windhoek, Namibia
      </div>
    </div>
  `;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "OshiCart <onboarding@resend.dev>",
      to: email,
      subject: `Payment Receipt — ${tierLabel} Plan (${params.months}mo)`,
      html,
    }),
  });

  console.log("[DPO Receipt Email] Sent to:", email);
}
