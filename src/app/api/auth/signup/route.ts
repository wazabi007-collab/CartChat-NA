import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { normalizeNamibianPhone } from "@/lib/utils";
import { SITE_URL } from "@/lib/constants";
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  whatsapp: z.string().min(7, "Valid WhatsApp number is required"),
  tier: z.string().optional(),
  ref: z.string().optional(),
});

/**
 * Create the account and send the confirmation email.
 *
 * This route used to pass `email_confirm: true`, which marks the address
 * verified without anyone proving they own it — so an account could claim
 * someone else's email, and every downstream "their email is confirmed"
 * assumption was hollow.
 *
 * That bypass was not carelessness: between 14 and 23 March 2026 eight people
 * signed up, were sent a confirmation, and NONE of them ever signed in. The
 * cause was that /auth/confirm did not exist yet — Supabase's email templates
 * send `token_hash` + `type`, those links landed on the homepage with an
 * unusable token, and no session was ever established. On 25 March the flow
 * was switched to force-confirm, which stopped the losses by removing the
 * broken step. The route exists now, so the step works and the bypass can go.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { email, password, whatsapp, tier, ref } = parsed.data;
    const normalizedPhone = normalizeNamibianPhone(whatsapp);
    const supabase = createServiceClient();

    // Where the confirmation link should land. /auth/confirm establishes the
    // session and then routes on, carrying the plan and referral code the
    // signup started with so neither is lost between inbox and setup.
    const next = new URLSearchParams();
    if (tier) next.set("tier", tier);
    if (ref) next.set("ref", ref);
    const redirectTo = `${SITE_URL}/auth/confirm${next.toString() ? `?${next}` : ""}`;

    // Duplicate detection is left to Postgres' unique constraint on the email.
    // This used to download the whole user table on every signup (two calls,
    // the first one's result never even read) and compare in JS: a page of
    // 1000, so past that the check silently stops finding duplicates and lets
    // a second account through — and every signup pays for the full fetch.
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        whatsapp_number: normalizedPhone,
      },
    });

    if (createError) {
      const alreadyRegistered =
        createError.status === 422 ||
        /already (been )?registered|already exists|duplicate/i.test(createError.message);
      if (alreadyRegistered) {
        return NextResponse.json(
          { ok: false, error: "An account with this email already exists. Please sign in." },
          { status: 409 }
        );
      }
      console.error("[Signup] Create user error:", createError);
      return NextResponse.json(
        { ok: false, error: createError.message || "Failed to create account" },
        { status: 500 }
      );
    }

    // admin.createUser does not send anything, so ask for the confirmation
    // explicitly. A mail failure must NOT fail the signup — the account
    // exists, and the page offers to send it again.
    const { error: mailError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (mailError) {
      console.error("[Signup] Confirmation email failed:", mailError.message);
    }

    return NextResponse.json({
      ok: true,
      user_id: newUser.user.id,
      email: newUser.user.email,
      // The client shows "check your inbox" rather than signing in, because
      // this project requires confirmation (mailer_autoconfirm is off) and a
      // password sign-in would fail with "Email not confirmed".
      needsConfirmation: true,
      emailSent: !mailError,
    });
  } catch (err) {
    console.error("[Signup]", err);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
