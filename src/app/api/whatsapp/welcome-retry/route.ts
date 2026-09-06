import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendWhatsAppEvent } from "@/lib/whatsapp-events";
import { SITE_URL } from "@/lib/constants";

/** One explicit recovery attempt, never a new arbitrary-recipient send path. */
export async function POST() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const service = createServiceClient();
  const { data: merchant, error } = await service.from("merchants")
    .select("id, store_name, store_slug, whatsapp_number")
    .eq("user_id", user.id).single();
  if (error || !merchant) return NextResponse.json({ ok: false }, { status: 403 });
  const originalKey = `welcome_merchant:${merchant.id}`;
  const retryKey = `${originalKey}:manual-retry`;
  const { data: history, error: historyError } = await service.from("whatsapp_messages")
    .select("event_key, status").eq("merchant_id", merchant.id)
    .eq("template_name", "welcome_merchant").in("event_key", [originalKey, retryKey]);
  if (historyError) return NextResponse.json({ ok: false, error: "Message history is unavailable. Please try later." }, { status: 503 });
  const retry = history?.find((row) => row.event_key === retryKey);
  const original = history?.find((row) => row.event_key === originalKey);
  if (retry?.status === "failed") return NextResponse.json({ ok: false, error: "The retry failed. Contact support; your store is still available." }, { status: 409 });
  if (retry || (original && original.status !== "failed")) {
    return NextResponse.json({ ok: true, skipped: true });
  }
  const result = await sendWhatsAppEvent({
    supabase: service, merchantId: merchant.id, eventKey: retryKey,
    templateName: "welcome_merchant", recipientPhone: merchant.whatsapp_number,
    variables: [merchant.store_name, `${SITE_URL}/s/${merchant.store_slug}`],
  });
  return NextResponse.json({ ok: result.ok, skipped: result.skipped,
    error: result.ok ? undefined : "The welcome message could not be sent. You can keep using your store." }, { status: result.ok ? 200 : 502 });
}
