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

    // Check if email already exists
    const { data: { users: existing } } = await supabase.auth.admin.listUsers({
      perPage: 1,
    });
    // More reliable: search by email
    const { data: { users: allUsers } } = await supabase.auth.admin.listUsers({
      perPage: 1000,
    });
    const emailExists = allUsers.some(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (emailExists) {
      return NextResponse.json(
        { ok: false, error: "An account with this email already exists. Please sign in." },
        { status: 409 }
      );
    }

    // Create user with confirmed email (skip email verification)
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        whatsapp_number: normalizedPhone,
      },
    });

    if (createError) {
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
