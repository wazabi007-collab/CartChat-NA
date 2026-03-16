import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/admin-permissions";
import { z } from "zod";

const paymentSchema = z.object({
  merchant_id: z.string().uuid(),
  amount_nad: z.number().positive("Amount must be positive"),
  payment_method: z.string().min(1, "Payment method required"),
  period_start: z.string().min(1),
  period_end: z.string().min(1),
  reference: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
  tier: z.enum(["oshi_start", "oshi_basic", "oshi_grow", "oshi_pro"]).optional(),
});

export async function GET(request: NextRequest) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const merchantId = searchParams.get("merchant_id");
  const method = searchParams.get("method");

  const service = createServiceClient();
  let query = service
    .from("payments")
    .select("*, merchants!inner(store_name)")
    .is("voided_at", null)
    .order("created_at", { ascending: false });

  if (merchantId) query = query.eq("merchant_id", merchantId);
  if (method) query = query.eq("payment_method", method);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ payments: data || [] });
}

export async function POST(request: NextRequest) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  if (!hasPermission(admin.role, "manage_billing")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { merchant_id, amount_nad, payment_method, reference, notes, period_start, period_end, tier } = parsed.data;

  const service = createServiceClient();

  // Get subscription
  const { data: sub } = await service
    .from("subscriptions")
    .select("id, tier, status")
    .eq("merchant_id", merchant_id)
    .single();

  if (!sub) {
    return NextResponse.json({ error: "No subscription found for this merchant" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Record payment
  const { error: payError } = await service.from("payments").insert({
    merchant_id,
    subscription_id: sub.id,
    amount_nad,
    payment_method,
    reference: reference || null,
    notes: notes || null,
    recorded_by: admin.adminId !== "env-fallback" ? admin.adminId : null,
    period_start,
    period_end,
  });

  if (payError) return NextResponse.json({ error: payError.message }, { status: 500 });

  // Activate subscription
  const newTier = tier || sub.tier;
  const { error: subError } = await service
    .from("subscriptions")
    .update({
      status: "active",
      tier: newTier,
      current_period_start: now,
      current_period_end: periodEnd,
      grace_ends_at: null,
      soft_suspended_at: null,
    })
    .eq("id", sub.id);

  if (subError) return NextResponse.json({ error: subError.message }, { status: 500 });

  // Reactivate merchant store if needed
  await service
    .from("merchants")
    .update({ store_status: "active", suspended_reason: null, updated_at: now })
    .eq("id", merchant_id)
    .in("store_status", ["suspended"]);

  // Audit log
  await service.from("admin_actions").insert({
    admin_user_id: admin.adminId !== "env-fallback" ? admin.adminId : null,
    action: "record_payment",
    target_type: "merchant",
    target_id: merchant_id,
    details: { amount_nad, payment_method, reference, tier: newTier, previous_status: sub.status },
  });

  return NextResponse.json({ success: true });
}
