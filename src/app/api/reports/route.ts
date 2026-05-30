import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { notifyAdmins } from "@/lib/whatsapp-events";
import { z } from "zod";

const reportSchema = z.object({
  merchantId: z.string().uuid("Invalid merchant ID"),
  reason: z.string().min(5, "Reason must be at least 5 characters").max(200),
  details: z.string().max(1000).optional(),
  reporterName: z.string().max(100).optional(),
  reporterContact: z.string().max(100).optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { merchantId, reason, details, reporterName, reporterContact } = parsed.data;
  const supabase = createServiceClient();

  const { data: report, error } = await supabase.from("reports").insert({
    merchant_id: merchantId,
    reason,
    details: details || null,
    reporter_name: reporterName || null,
    reporter_contact: reporterContact || null,
  }).select("id").single();

  if (error) {
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
  }

  const { data: merchant } = await supabase
    .from("merchants")
    .select("store_name")
    .eq("id", merchantId)
    .single();

  await notifyAdmins({
    supabase,
    merchantId,
    eventKeyPrefix: `admin_safety_review_alert:report:${report?.id || merchantId}`,
    templateName: "admin_safety_review_alert",
    variables: [
      merchant?.store_name || "Unknown store",
      "customer report",
      reason,
    ],
  });

  return NextResponse.json({ success: true });
}
