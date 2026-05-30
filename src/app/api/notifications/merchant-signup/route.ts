import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { notifyAdmins } from "@/lib/whatsapp-events";

export async function POST(request: NextRequest) {
  const { merchant_id } = await request.json().catch(() => ({}));
  if (!merchant_id) {
    return NextResponse.json({ error: "Missing merchant_id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { data: merchant } = await service
    .from("merchants")
    .select("id, user_id, store_name, industry, whatsapp_number")
    .eq("id", merchant_id)
    .single();

  if (!merchant || merchant.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await notifyAdmins({
    supabase: service,
    merchantId: merchant.id,
    eventKeyPrefix: `admin_new_merchant_signup:${merchant.id}`,
    templateName: "admin_new_merchant_signup",
    variables: [
      merchant.store_name,
      merchant.whatsapp_number || "No WhatsApp",
      merchant.industry || "other",
    ],
  });

  return NextResponse.json({ success: true });
}
