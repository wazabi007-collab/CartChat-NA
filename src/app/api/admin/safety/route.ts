import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/admin-permissions";
import { createServiceClient } from "@/lib/supabase/service";

export async function PATCH(request: NextRequest) {
  const admin = await getAuthenticatedAdmin();
  if (!admin || !hasPermission(admin.role, "manage_safety")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { reviewId, status, adminNotes, productStatus, storeStatus } = await request.json().catch(() => ({}));
  if (!reviewId || !["reviewed", "dismissed"].includes(status)) {
    return NextResponse.json({ error: "Invalid safety review action" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: review, error: loadError } = await service
    .from("safety_reviews")
    .select("id, merchant_id, product_id")
    .eq("id", reviewId)
    .single();

  if (loadError || !review) {
    return NextResponse.json({ error: loadError?.message || "Review not found" }, { status: 404 });
  }

  const { error: reviewError } = await service
    .from("safety_reviews")
    .update({
      status,
      admin_notes: adminNotes || null,
      updated_at: new Date().toISOString(),
      resolved_at: new Date().toISOString(),
    })
    .eq("id", reviewId);

  if (reviewError) {
    return NextResponse.json({ error: reviewError.message }, { status: 500 });
  }

  if (review.product_id && productStatus && ["approved", "blocked"].includes(productStatus)) {
    const { error } = await service
      .from("products")
      .update({
        moderation_status: productStatus,
        is_available: productStatus === "approved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", review.product_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (storeStatus && ["active", "suspended", "banned"].includes(storeStatus)) {
    const { error } = await service
      .from("merchants")
      .update({ store_status: storeStatus })
      .eq("id", review.merchant_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
