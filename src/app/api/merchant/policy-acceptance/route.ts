import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SAFETY_POLICY_VERSION } from "@/lib/safety/prohibited-content";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { merchantId, version } = await request.json().catch(() => ({}));
  if (!merchantId || version !== SAFETY_POLICY_VERSION) {
    return NextResponse.json({ error: "Invalid policy acceptance" }, { status: 400 });
  }

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const ip = forwardedFor || realIp || null;

  const { error } = await supabase
    .from("merchants")
    .update({
      prohibited_policy_accepted_at: new Date().toISOString(),
      prohibited_policy_version: SAFETY_POLICY_VERSION,
      prohibited_policy_accepted_ip: ip,
    })
    .eq("id", merchantId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
