import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  const { merchantId, reason, details, reporterName, reporterContact } = await request.json();

  if (!merchantId || !reason) {
    return NextResponse.json({ error: "Merchant ID and reason are required" }, { status: 400 });
  }

  if (reason.length > 200 || (details && details.length > 1000)) {
    return NextResponse.json({ error: "Text too long" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { error } = await supabase.from("reports").insert({
    merchant_id: merchantId,
    reason,
    details: details || null,
    reporter_name: reporterName || null,
    reporter_contact: reporterContact || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
