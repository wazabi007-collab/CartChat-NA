import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";

const schema = z.object({
  token: z.string().min(20),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Reset link is invalid or the password is too short." },
        { status: 400 }
      );
    }

    const tokenHash = createHash("sha256")
      .update(parsed.data.token)
      .digest("hex");
    const service = createServiceClient();

    const { data: tokenRow, error: tokenError } = await service
      .from("admin_password_reset_tokens")
      .select("id, admin_user_id, expires_at, used_at, admin_users(user_id, email)")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (tokenError) {
      console.error("[AdminCompleteReset] token lookup error:", tokenError);
      return NextResponse.json(
        { error: "Reset link is invalid or expired." },
        { status: 400 }
      );
    }

    if (
      !tokenRow ||
      tokenRow.used_at ||
      new Date(tokenRow.expires_at).getTime() < Date.now()
    ) {
      return NextResponse.json(
        { error: "Reset link is invalid or expired." },
        { status: 400 }
      );
    }

    const adminInfo = tokenRow.admin_users as
      | { user_id?: string; email?: string }
      | { user_id?: string; email?: string }[]
      | null;
    const adminUser = Array.isArray(adminInfo) ? adminInfo[0] : adminInfo;
    const userId = adminUser?.user_id;

    if (!userId) {
      console.error("[AdminCompleteReset] admin user_id missing");
      return NextResponse.json(
        { error: "Reset link is invalid or expired." },
        { status: 400 }
      );
    }

    const { error: updateError } = await service.auth.admin.updateUserById(
      userId,
      { password: parsed.data.password }
    );

    if (updateError) {
      console.error("[AdminCompleteReset] password update error:", updateError);
      return NextResponse.json(
        { error: "Unable to update password. Please request a new reset link." },
        { status: 500 }
      );
    }

    await service
      .from("admin_password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenRow.id);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[AdminCompleteReset]", err);
    return NextResponse.json(
      { error: "Unable to update password. Please request a new reset link." },
      { status: 500 }
    );
  }
}
