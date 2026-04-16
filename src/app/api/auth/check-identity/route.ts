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

    // listUsers returns each user with their identities array attached — one
    // round-trip, no custom auth schema queries needed.
    const { data, error } = await supabase.auth.admin.listUsers({
      perPage: 1000,
    });

    if (error || !data) {
      if (error) console.error("[CheckIdentity] listUsers error:", error);
      return NextResponse.json({ providers: [] }, { status: 200 });
    }

    const user = data.users.find(
      (u) => u.email?.toLowerCase() === email
    );

    if (!user) {
      return NextResponse.json({ providers: [] }, { status: 200 });
    }

    const providers = Array.from(
      new Set((user.identities ?? []).map((i) => i.provider))
    );
    return NextResponse.json({ providers }, { status: 200 });
  } catch (err) {
    console.error("[CheckIdentity]", err);
    return NextResponse.json({ providers: [] }, { status: 200 });
  }
}
