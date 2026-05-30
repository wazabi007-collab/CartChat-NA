import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/admin-permissions";
import { sendWhatsAppEvent } from "@/lib/whatsapp-events";
import {
  getAnnouncementRecipients,
  type MerchantAnnouncementAudience,
} from "../audience";

const sendSchema = z.object({
  title: z.string().min(3).max(120),
  message: z.string().min(5).max(800),
  audience: z.enum(["all", "active", "trial", "paid", "expiring_soon"]),
  template_name: z.enum(["merchant_platform_update", "merchant_maintenance_notice"]),
});

export async function POST(request: NextRequest) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  if (!hasPermission(admin.role, "manage_announcements")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = sendSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const service = createServiceClient();
  const recipients = await getAnnouncementRecipients(
    service,
    parsed.data.audience as MerchantAnnouncementAudience
  );

  const { data: announcement, error: announcementError } = await service
    .from("merchant_announcements")
    .insert({
      title: parsed.data.title,
      template_name: parsed.data.template_name,
      audience_filter: parsed.data.audience,
      variables: [parsed.data.title, parsed.data.message],
      status: "sending",
      recipient_count: recipients.length,
      created_by: admin.adminId !== "env-fallback" ? admin.adminId : null,
    })
    .select("id")
    .single();

  if (announcementError || !announcement) {
    return NextResponse.json(
      { error: announcementError?.message || "Failed to create announcement" },
      { status: 500 }
    );
  }

  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const result = await sendWhatsAppEvent({
      supabase: service,
      merchantId: recipient.merchant_id,
      eventKey: `announcement:${announcement.id}:${recipient.merchant_id}`,
      templateName: parsed.data.template_name,
      recipientPhone: recipient.whatsapp_number,
      variables: [recipient.store_name, parsed.data.title, parsed.data.message],
    });

    if (result.ok) sent++;
    else failed++;
  }

  await service
    .from("merchant_announcements")
    .update({
      status: failed > 0 && sent === 0 ? "failed" : "sent",
      sent_count: sent,
      failed_count: failed,
      sent_at: new Date().toISOString(),
    })
    .eq("id", announcement.id);

  await service.from("admin_actions").insert({
    admin_user_id: admin.adminId !== "env-fallback" ? admin.adminId : null,
    action: "send_merchant_announcement",
    target_type: "merchant_announcement",
    target_id: announcement.id,
    details: {
      title: parsed.data.title,
      template_name: parsed.data.template_name,
      audience: parsed.data.audience,
      sent,
      failed,
    },
  });

  return NextResponse.json({
    success: true,
    announcement_id: announcement.id,
    recipient_count: recipients.length,
    sent,
    failed,
  });
}
