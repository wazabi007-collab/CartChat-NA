import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Email-link sign-in: magic links, email confirmation, email change, recovery.
 *
 * /auth/callback only handles `?code=` (the PKCE exchange used by password
 * signup and Google). Supabase's own email templates send `token_hash` +
 * `type` instead, and without this route those links landed on the homepage
 * with an unusable token in the URL fragment — the cookie-based session was
 * never established, so the merchant simply appeared signed out with no
 * explanation. Nothing reaches this route today because signups use a
 * password or Google, but it breaks the moment email confirmation or
 * passwordless login is switched on.
 *
 * Routing mirrors /auth/callback exactly: an existing merchant goes to their
 * dashboard (or to checkout when a tier is being bought), a brand-new user
 * goes to setup carrying tier and referral code.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const tier = searchParams.get("tier");
  const ref = searchParams.get("ref");
  const next = searchParams.get("next");

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    // Expired or already-used links land here — the login page explains it
    // rather than dumping a Supabase error on the merchant.
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  // A recovery link must reach the password form, not the dashboard.
  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/auth/reset-password`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  // Only same-origin relative paths, so the link cannot be used as an open
  // redirect to another site.
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (merchant) {
    if (tier) {
      return NextResponse.redirect(
        `${origin}/pricing/checkout?tier=${encodeURIComponent(tier)}`
      );
    }
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  const params = new URLSearchParams();
  if (tier) params.set("tier", tier);
  if (ref) params.set("ref", ref);
  const qs = params.toString();
  return NextResponse.redirect(`${origin}/dashboard/setup${qs ? `?${qs}` : ""}`);
}
