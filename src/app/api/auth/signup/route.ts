import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { normalizeNamibianPhone } from "@/lib/utils";
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  whatsapp: z.string().min(7, "Valid WhatsApp number is required"),
});

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

    const { email, password, whatsapp } = parsed.data;
    const normalizedPhone = normalizeNamibianPhone(whatsapp);
    const supabase = createServiceClient();

    // Duplicate detection is left to Postgres' unique constraint on the email.
    // This used to download the whole user table on every signup (two calls,
    // the first one's result never even read) and compare in JS: a page of
    // 1000, so past that the check silently stops finding duplicates and lets
    // a second account through — and every signup pays for the full fetch.
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
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

    return NextResponse.json({
      ok: true,
      user_id: newUser.user.id,
      email: newUser.user.email,
    });
  } catch (err) {
    console.error("[Signup]", err);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
