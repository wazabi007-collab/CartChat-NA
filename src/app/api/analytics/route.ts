import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// POST /api/analytics — increment page view for a merchant (called from storefront)
export async function POST(request: NextRequest) {
  try {
    const { merchant_id } = await request.json();

    if (!merchant_id || typeof merchant_id !== "string") {
      return NextResponse.json({ error: "merchant_id required" }, { status: 400 });
    }

    // Validate UUID format to prevent injection
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(merchant_id)) {
      return NextResponse.json({ error: "Invalid merchant_id" }, { status: 400 });
    }

    // Verify merchant exists and is active
    const service = createServiceClient();
    const { data: merchant } = await service
      .from("merchants")
      .select("id")
      .eq("id", merchant_id)
      .eq("store_status", "active")
      .single();

    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const today = new Date().toISOString().split("T")[0];

    // Storefront visitors are anonymous, so this upsert must run with the service-role
    // client: store_analytics RLS is owner-only, so the previous anon-client write was
    // silently rejected and page views were never recorded. merchant_id is validated
    // (UUID format + active store) above before we reach here.
    const { data: existing } = await service
      .from("store_analytics")
      .select("id, page_views")
      .eq("merchant_id", merchant_id)
      .eq("date", today)
      .maybeSingle();

    if (existing) {
      await service
        .from("store_analytics")
        .update({ page_views: existing.page_views + 1 })
        .eq("id", existing.id);
    } else {
      await service.from("store_analytics").insert({
        merchant_id,
        date: today,
        page_views: 1,
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
