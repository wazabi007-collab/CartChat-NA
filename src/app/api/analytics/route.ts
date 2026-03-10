import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/analytics — increment page view for a merchant
export async function POST(request: NextRequest) {
  try {
    const { merchant_id } = await request.json();

    if (!merchant_id) {
      return NextResponse.json({ error: "merchant_id required" }, { status: 400 });
    }

    const supabase = await createClient();
    const today = new Date().toISOString().split("T")[0];

    // Upsert: increment page_views for today, create row if not exists
    const { data: existing } = await supabase
      .from("store_analytics")
      .select("id, page_views")
      .eq("merchant_id", merchant_id)
      .eq("date", today)
      .single();

    if (existing) {
      await supabase
        .from("store_analytics")
        .update({ page_views: existing.page_views + 1 })
        .eq("id", existing.id);
    } else {
      await supabase.from("store_analytics").insert({
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
