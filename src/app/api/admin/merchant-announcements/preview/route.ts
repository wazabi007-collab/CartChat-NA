import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/admin-permissions";
import {
  getAnnouncementRecipients,
  type MerchantAnnouncementAudience,
} from "../audience";

const previewSchema = z.object({
  audience: z.enum(["all", "active", "trial", "paid", "expiring_soon"]),
});

export async function POST(request: NextRequest) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  if (!hasPermission(admin.role, "view_announcements")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = previewSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const service = createServiceClient();
  const recipients = await getAnnouncementRecipients(
    service,
    parsed.data.audience as MerchantAnnouncementAudience
  );

  return NextResponse.json({
    count: recipients.length,
    sample: recipients.slice(0, 10).map((r) => ({
      store_name: r.store_name,
      whatsapp_number: r.whatsapp_number,
    })),
  });
}
