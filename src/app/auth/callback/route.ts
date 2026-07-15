import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = await searchParams.get("code");
  const tier = await searchParams.get("tier");
  const ref = await searchParams.get("ref");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  // Check merchant existence to decide where to send the user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: merchant } = await supabase
      .from("merchants")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (merchant) {
      // Existing merchant with tier param → pricing checkout
      if (tier) {
        return NextResponse.redirect(`${origin}/pricing/checkout?tier=${encodeURIComponent(tier)}`);
      }
      return NextResponse.redirect(`${origin}/dashboard`);
    } else {
      // New user → setup (carry tier and referral code if present)
      const params = new URLSearchParams();
      if (tier) params.set("tier", tier);
      if (ref) params.set("ref", ref);
      const qs = params.toString();
      return NextResponse.redirect(`${origin}/dashboard/setup${qs ? `?${qs}` : ""}`);
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
