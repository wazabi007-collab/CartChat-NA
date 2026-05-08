import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const email = parsed.data.email.toLowerCase();
    const service = createServiceClient();

    const { data: adminUser, error: adminError } = await service
      .from("admin_users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (adminError) {
      console.error("[AdminReset] admin lookup error:", adminError);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (!adminUser) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const origin = new URL(req.url).origin;
    const redirectTo = `${origin}/auth/reset-password?next=/admin/login`;
    const { error } = await service.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      console.error("[AdminReset] reset email error:", error);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[AdminReset]", err);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
