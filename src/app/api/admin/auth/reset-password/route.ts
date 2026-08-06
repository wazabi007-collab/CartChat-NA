import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { SITE_NAME, SITE_URL } from "@/lib/constants";

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
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (adminError) {
      console.error("[AdminReset] admin lookup error:", adminError);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (!adminUser) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await service
      .from("admin_password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("admin_user_id", adminUser.id)
      .is("used_at", null);

    const { error: insertError } = await service
      .from("admin_password_reset_tokens")
      .insert({
        admin_user_id: adminUser.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error("[AdminReset] token insert error:", insertError);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.error("[AdminReset] RESEND_API_KEY not set");
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const origin = new URL(req.url).origin || SITE_URL;
    const resetUrl = `${origin}/admin/reset-password?token=${encodeURIComponent(token)}`;
    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#0f172a;padding:24px;text-align:center;border-radius:12px 12px 0 0;">
          <h1 style="color:white;margin:0;font-size:20px;">${SITE_NAME} Admin Password Reset</h1>
          <p style="color:rgba(255,255,255,0.72);margin:8px 0 0;font-size:14px;">Secure control center access</p>
        </div>
        <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;">
          <p style="font-size:14px;line-height:1.6;color:#334155;margin:0 0 18px;">
            A password reset was requested for your ${SITE_NAME} admin account.
            This link expires in 60 minutes.
          </p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${resetUrl}" style="display:inline-block;background:#16a34a;color:white;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">
              Reset admin password
            </a>
          </div>
          <p style="font-size:12px;line-height:1.6;color:#64748b;margin:0;">
            If you did not request this, ignore this email. Your current password will stay unchanged.
          </p>
        </div>
        <div style="text-align:center;padding:16px;font-size:12px;color:#94a3b8;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;background:#f8fafc;">
          ${SITE_NAME} Admin
        </div>
      </div>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_ADMIN || process.env.RESEND_FROM || `${SITE_NAME} Admin <admin@oshicart.com>`,
        to: adminUser.email,
        subject: `${SITE_NAME} admin password reset`,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("[AdminReset] email error:", resendRes.status, errText);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[AdminReset]", err);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
