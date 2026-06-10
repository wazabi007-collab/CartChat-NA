import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/admin-permissions";
import { createServiceClient } from "@/lib/supabase/service";

type SafetyReviewRow = {
  id: string;
  merchant_id: string;
  product_id: string | null;
  severity: "review" | "block";
  status: "open" | "reviewed" | "dismissed";
};

type SafetyRequestBody = {
  reviewId?: unknown;
  reviewIds?: unknown;
  approveAllOpenListingReviews?: unknown;
  status?: unknown;
  adminNotes?: unknown;
  productStatus?: unknown;
  storeStatus?: unknown;
};

export async function PATCH(request: NextRequest) {
  const admin = await getAuthenticatedAdmin();
  if (!admin || !hasPermission(admin.role, "manage_safety")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as SafetyRequestBody;
  const { reviewId, status, adminNotes, productStatus, storeStatus } = body;
  const reviewIdString = typeof reviewId === "string" ? reviewId : "";
  const statusString = typeof status === "string" ? status : "";
  const adminNotesString = typeof adminNotes === "string" ? adminNotes : "";
  const productStatusString = typeof productStatus === "string" ? productStatus : "";
  const storeStatusString = typeof storeStatus === "string" ? storeStatus : "";
  const isBulkAction = body.approveAllOpenListingReviews === true || Array.isArray(body.reviewIds);

  if (!reviewIdString || !["reviewed", "dismissed"].includes(statusString)) {
    if (isBulkAction) {
      return handleBulkSafetyAction(body, admin.adminId);
    }
    return NextResponse.json({ error: "Invalid safety review action" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: review, error: loadError } = await service
    .from("safety_reviews")
    .select("id, merchant_id, product_id")
    .eq("id", reviewIdString)
    .single();

  if (loadError || !review) {
    return NextResponse.json({ error: loadError?.message || "Review not found" }, { status: 404 });
  }

  const { error: reviewError } = await service
    .from("safety_reviews")
    .update({
      status: statusString,
      admin_notes: adminNotesString || null,
      updated_at: new Date().toISOString(),
      resolved_at: new Date().toISOString(),
    })
    .eq("id", reviewIdString);

  if (reviewError) {
    return NextResponse.json({ error: reviewError.message }, { status: 500 });
  }

  if (review.product_id && productStatusString && ["approved", "blocked"].includes(productStatusString)) {
    const { error } = await service
      .from("products")
      .update({
        moderation_status: productStatusString,
        is_available: productStatusString === "approved",
        moderation_source: productStatusString === "approved" ? "admin_approved" : "admin_blocked",
        moderation_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", review.product_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (storeStatusString && ["active", "suspended", "banned"].includes(storeStatusString)) {
    const { error } = await service
      .from("merchants")
      .update({ store_status: storeStatusString })
      .eq("id", review.merchant_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}

async function handleBulkSafetyAction(body: SafetyRequestBody, adminId: string) {
  if (body.status !== "reviewed" || body.productStatus !== "approved") {
    return NextResponse.json({ error: "Bulk approval only supports approving listing reviews." }, { status: 400 });
  }

  const service = createServiceClient();
  const now = new Date().toISOString();
  const adminNotes = typeof body.adminNotes === "string" && body.adminNotes.trim()
    ? body.adminNotes.trim()
    : "Batch approved listing reviews";
  const approveAllOpenListingReviews = body.approveAllOpenListingReviews === true;
  const selectedReviewIds = Array.isArray(body.reviewIds)
    ? Array.from(new Set(body.reviewIds.filter((id): id is string => typeof id === "string" && id.length > 0)))
    : [];

  if (!approveAllOpenListingReviews && selectedReviewIds.length === 0) {
    return NextResponse.json({ error: "No listing reviews selected." }, { status: 400 });
  }

  let reviewQuery = service
    .from("safety_reviews")
    .select("id, merchant_id, product_id, severity, status")
    .eq("status", "open")
    .not("product_id", "is", null);

  if (approveAllOpenListingReviews) {
    reviewQuery = reviewQuery.eq("severity", "review");
  } else {
    reviewQuery = reviewQuery.in("id", selectedReviewIds);
  }

  const { data: reviews, error: loadError } = await reviewQuery;
  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 });
  }

  const reviewRows = (reviews || []) as SafetyReviewRow[];
  if (reviewRows.length === 0) {
    return NextResponse.json({ error: "No open listing reviews found to approve." }, { status: 404 });
  }

  const blockedReview = reviewRows.find((review) => review.severity === "block");
  if (blockedReview) {
    return NextResponse.json(
      { error: "Blocked-risk listings must be reviewed individually before approval." },
      { status: 400 }
    );
  }

  if (!approveAllOpenListingReviews && reviewRows.length !== selectedReviewIds.length) {
    return NextResponse.json(
      { error: "Some selected reviews were already resolved. Refresh the page and try again." },
      { status: 409 }
    );
  }

  const reviewIds = reviewRows.map((review) => review.id);
  const productIds = Array.from(new Set(reviewRows.map((review) => review.product_id).filter((id): id is string => Boolean(id))));

  const { error: reviewUpdateError } = await service
    .from("safety_reviews")
    .update({
      status: "reviewed",
      admin_notes: adminNotes,
      updated_at: now,
      resolved_at: now,
    })
    .in("id", reviewIds);

  if (reviewUpdateError) {
    return NextResponse.json({ error: reviewUpdateError.message }, { status: 500 });
  }

  const { error: productUpdateError } = await service
    .from("products")
    .update({
      moderation_status: "approved",
      is_available: true,
      moderation_source: "admin_approved",
      moderation_checked_at: now,
      updated_at: now,
    })
    .in("id", productIds);

  if (productUpdateError) {
    return NextResponse.json({ error: productUpdateError.message }, { status: 500 });
  }

  await service.from("admin_actions").insert({
    admin_user_id: adminId !== "env-fallback" ? adminId : null,
    action: approveAllOpenListingReviews ? "bulk_approve_all_safety_reviews" : "bulk_approve_safety_reviews",
    target_type: "safety_review",
    target_id: reviewIds[0],
    details: {
      review_count: reviewIds.length,
      product_count: productIds.length,
      review_ids: reviewIds,
      scope: approveAllOpenListingReviews ? "all_open_listing_reviews" : "selected_listing_reviews",
    },
  });

  return NextResponse.json({
    success: true,
    approvedReviews: reviewIds.length,
    approvedProducts: productIds.length,
  });
}
