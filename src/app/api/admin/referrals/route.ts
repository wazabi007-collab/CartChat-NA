import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/admin-permissions";

export async function POST(req: NextRequest) {
  const admin = await getAuthenticatedAdmin();
  if (!admin || !hasPermission(admin.role, "manage_referrals")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const action = body?.action;
  const supabase = createServiceClient();

  if (action === "create_referrer") {
    const code = String(body.code || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    if (!/^[a-z0-9][a-z0-9-]{1,30}$/.test(code)) {
      return NextResponse.json({ error: "Code must be 2–31 chars: lowercase letters, numbers, hyphens." }, { status: 400 });
    }
    if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
    const { error } = await supabase.from("referrers").insert({
      code,
      name,
      whatsapp: body.whatsapp ? String(body.whatsapp).trim() : null,
      payout_number: body.payout_number ? String(body.payout_number).trim() : null,
    });
    if (error) {
      const msg = error.code === "23505" ? "That code is already taken." : "Could not create referrer.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "toggle_active") {
    const { error } = await supabase
      .from("referrers")
      .update({ is_active: !!body.is_active })
      .eq("id", String(body.referrer_id));
    if (error) return NextResponse.json({ error: "Could not update referrer." }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (action === "mark_paid") {
    const commission = Number(body.commission_nad);
    if (!body.merchant_id || !body.referrer_code || !Number.isFinite(commission) || commission < 0) {
      return NextResponse.json({ error: "Invalid payout data." }, { status: 400 });
    }
    const { error } = await supabase.from("referral_payouts").insert({
      merchant_id: String(body.merchant_id),
      referrer_code: String(body.referrer_code),
      commission_nad: Math.round(commission),
      paid_reference: body.paid_reference ? String(body.paid_reference).trim() : null,
      admin_note: body.admin_note ? String(body.admin_note).trim() : null,
      paid_by: admin.userId ?? null,
    });
    if (error) {
      const msg = error.code === "23505" ? "This merchant's bounty was already paid." : "Could not record payout.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
