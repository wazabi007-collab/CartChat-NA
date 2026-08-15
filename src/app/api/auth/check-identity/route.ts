import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
});

/**
 * Checks whether an email belongs to a user whose only sign-in method is Google OAuth.
 * Used by the forgot-password form to guide Google-only users toward the Google sign-in button.
 *
 * Security note: To limit account enumeration, we return { providers: [] } for both
 * "user does not exist" and "user exists but has no identities" — the caller treats
 * both as "proceed with normal reset flow".
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ providers: [] }, { status: 200 });
    }

    const email = parsed.data.email.toLowerCase();
    const supabase = createServiceClient();

    // Indexed lookup. This used to download a 1000-row page of users on every
    // forgot-password attempt and match in JavaScript, which both got slower
    // with every signup and stopped finding anyone past that page.
    const { data, error } = await supabase.rpc("auth_user_lookup", {
      p_email: email,
    });

    if (error) {
      console.error("[CheckIdentity] lookup error:", error);
      return NextResponse.json({ providers: [] }, { status: 200 });
    }

    const row = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({ providers: row?.providers ?? [] }, { status: 200 });
  } catch (err) {
    console.error("[CheckIdentity]", err);
    return NextResponse.json({ providers: [] }, { status: 200 });
  }
}
