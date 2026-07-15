import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { normalizeNamibianPhone } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim().toLowerCase() : "";
  const phone = typeof body?.phone === "string" ? body.phone : "";

  if (!code) return NextResponse.json({ valid: false });

  const supabase = createServiceClient();
  const { data: referrer } = await supabase
    .from("referrers")
    .select("name, whatsapp")
    .eq("code", code)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (!referrer) return NextResponse.json({ valid: false });

  // Self-referral guard: a promoter can't refer their own new store.
  if (phone && referrer.whatsapp) {
    if (normalizeNamibianPhone(phone) === normalizeNamibianPhone(referrer.whatsapp)) {
      return NextResponse.json({ valid: false });
    }
  }

  return NextResponse.json({ valid: true, referrerName: referrer.name });
}
