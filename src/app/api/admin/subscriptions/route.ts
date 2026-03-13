import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/admin-permissions";

export async function PATCH(request: NextRequest) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  if (!hasPermission(admin.role, "manage_merchants")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { merchant_id, tier, status, set_period } = await request.json();
  if (!merchant_id) return NextResponse.json({ error: "Missing merchant_id" }, { status: 400 });

  const service = createServiceClient();

  // Get current state
  const { data: before } = await service
    .from("subscriptions")
    .select("tier, status")
    .eq("merchant_id", merchant_id)
    .single();

  if (!before) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (tier && ["oshi_start", "oshi_basic", "oshi_grow", "oshi_pro"].includes(tier)) {
    updates.tier = tier;
  }
  if (status && ["trial", "active", "grace", "soft_suspended", "hard_suspended"].includes(status)) {
    updates.status = status;
    // When activating with set_period, set a 30-day billing period
    if (status === "active" && set_period) {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() + 30);
      updates.current_period_start = now.toISOString();
      updates.current_period_end = periodEnd.toISOString();
      updates.grace_ends_at = null;
      updates.soft_suspended_at = null;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid updates" }, { status: 400 });
  }

  const { error } = await service
    .from("subscriptions")
    .update(updates)
    .eq("merchant_id", merchant_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sync merchant store_status if subscription goes to hard_suspended
  if (updates.status === "hard_suspended") {
    await service
      .from("merchants")
      .update({ store_status: "suspended", suspended_reason: "non_payment", updated_at: new Date().toISOString() })
      .eq("id", merchant_id);
  } else if (updates.status === "active") {
    await service
      .from("merchants")
      .update({ store_status: "active", suspended_reason: null, updated_at: new Date().toISOString() })
      .eq("id", merchant_id)
      .in("store_status", ["suspended"]);
  }

  await service.from("admin_actions").insert({
    admin_user_id: admin.adminId !== "env-fallback" ? admin.adminId : null,
    action: tier ? "change_tier" : "change_subscription_status",
    target_type: "subscription",
    target_id: merchant_id,
    details: { before, after: updates },
  });

  return NextResponse.json({ success: true });
}
