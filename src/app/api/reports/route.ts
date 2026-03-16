import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
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

  const { error } = await supabase.from("reports").insert({
    merchant_id: merchantId,
    reason,
    details: details || null,
    reporter_name: reporterName || null,
    reporter_contact: reporterContact || null,
  });

  if (error) {
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
