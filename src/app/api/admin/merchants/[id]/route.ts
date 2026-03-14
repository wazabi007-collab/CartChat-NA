import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/admin-permissions";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await params;
  const service = createServiceClient();

  const [merchantRes, subRes, paymentsRes, productsRes, ordersRes, actionsRes] = await Promise.all([
    service.from("merchants").select("*").eq("id", id).single(),
    service.from("subscriptions").select("*").eq("merchant_id", id).single(),
    service.from("payments").select("*").eq("merchant_id", id).order("created_at", { ascending: false }),
    service.from("products").select("id", { count: "exact", head: true }).eq("merchant_id", id),
    service.from("orders").select("id, subtotal_nad, created_at, status").eq("merchant_id", id).order("created_at", { ascending: false }),
    service.from("admin_actions").select("*").eq("target_id", id).order("created_at", { ascending: false }).limit(50),
  ]);

  if (!merchantRes.data) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const ordersThisMonth = (ordersRes.data || []).filter(
    (o) => o.created_at >= monthStart && o.status !== "cancelled"
  ).length;
  const totalRevenue = (ordersRes.data || [])
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + (o.subtotal_nad || 0), 0);

  return NextResponse.json({
    merchant: merchantRes.data,
    subscription: subRes.data,
    payments: paymentsRes.data || [],
    productCount: productsRes.count || 0,
    ordersThisMonth,
    totalRevenue,
    orders: ordersRes.data || [],
    actions: actionsRes.data || [],
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { action, ...data } = body;
  const service = createServiceClient();

  if (action === "change_status") {
    if (!hasPermission(admin.role, "manage_merchants")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { status, reason } = data;
    if (!["pending", "active", "suspended", "banned"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { data: before } = await service.from("merchants").select("store_status").eq("id", id).single();

    const updateData: Record<string, unknown> = {
      store_status: status,
      updated_at: new Date().toISOString(),
    };
    if (status === "suspended" && reason) updateData.suspended_reason = reason;
    if (status === "active") updateData.suspended_reason = null;

    const { error } = await service.from("merchants").update(updateData).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await service.from("admin_actions").insert({
      admin_user_id: admin.adminId !== "env-fallback" ? admin.adminId : null,
      action: `${status}_store`,
      target_type: "merchant",
      target_id: id,
      details: { before: before?.store_status, after: status, reason },
    });

    return NextResponse.json({ success: true });
  }

  if (action === "change_tier") {
    if (!hasPermission(admin.role, "manage_merchants")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { tier } = data;
    if (!["oshi_start", "oshi_basic", "oshi_grow", "oshi_pro"].includes(tier)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    const { data: before } = await service.from("subscriptions").select("tier").eq("merchant_id", id).single();

    const { error } = await service
      .from("subscriptions")
      .update({ tier })
      .eq("merchant_id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await service.from("admin_actions").insert({
      admin_user_id: admin.adminId !== "env-fallback" ? admin.adminId : null,
      action: "change_tier",
      target_type: "merchant",
      target_id: id,
      details: { before: before?.tier, after: tier },
    });

    return NextResponse.json({ success: true });
  }

  if (action === "delete_store") {
    if (!hasPermission(admin.role, "manage_merchants")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get merchant info for audit log before deleting
    const { data: merchant } = await service.from("merchants").select("store_name, user_id").eq("id", id).single();
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    // Delete in order: order_items → orders → stock_adjustments → products → categories → reports → subscriptions → payments → merchant
    // Most have ON DELETE CASCADE, but let's be explicit for safety
    await service.from("subscriptions").delete().eq("merchant_id", id);
    await service.from("payments").delete().eq("merchant_id", id);
    await service.from("reports").delete().eq("merchant_id", id);

    // Delete the merchant (cascades to products, orders, categories, etc.)
    const { error } = await service.from("merchants").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Log the action
    await service.from("admin_actions").insert({
      admin_user_id: admin.adminId !== "env-fallback" ? admin.adminId : null,
      action: "delete_store",
      target_type: "merchant",
      target_id: id,
      details: { store_name: merchant.store_name, user_id: merchant.user_id },
    });

    return NextResponse.json({ success: true, deleted: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
