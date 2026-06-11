import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/subscription/cancel  { cancel: boolean }
 * Sets subscriptions.cancel_at_period_end for the authenticated merchant.
 * Only togglable from active/grace. Uses the service client so the write
 * stays off the merchant-guarded subscriptions RLS path.
 */
export async function POST(req: NextRequest) {
  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const cancel = body?.cancel;
  if (typeof cancel !== "boolean") {
    return NextResponse.json({ error: "Missing 'cancel' boolean" }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: merchant } = await service
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!merchant) {
    return NextResponse.json({ error: "No store found" }, { status: 404 });
  }

  const { data: sub } = await service
    .from("subscriptions")
    .select("id, status")
    .eq("merchant_id", merchant.id)
    .single();
  if (!sub) {
    return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  }
  if (!["active", "grace"].includes(sub.status)) {
    return NextResponse.json(
      { error: "Only active subscriptions can be cancelled" },
      { status: 400 }
    );
  }

  const { error } = await service
    .from("subscriptions")
    .update({ cancel_at_period_end: cancel })
    .eq("id", sub.id);
  if (error) {
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
  }

  return NextResponse.json({ success: true, cancel_at_period_end: cancel });
}
