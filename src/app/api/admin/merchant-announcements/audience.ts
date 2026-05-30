import { createServiceClient } from "@/lib/supabase/service";

export type MerchantAnnouncementAudience =
  | "all"
  | "active"
  | "trial"
  | "paid"
  | "expiring_soon";

export interface AnnouncementRecipient {
  merchant_id: string;
  store_name: string;
  whatsapp_number: string | null;
}

export async function getAnnouncementRecipients(
  service: ReturnType<typeof createServiceClient>,
  audience: MerchantAnnouncementAudience
): Promise<AnnouncementRecipient[]> {
  if (audience === "all" || audience === "active") {
    let query = service
      .from("merchants")
      .select("id, store_name, whatsapp_number, store_status")
      .not("whatsapp_number", "is", null);

    if (audience === "active") query = query.eq("store_status", "active");

    const { data } = await query.order("created_at", { ascending: false });
    return (data || []).map((merchant) => ({
      merchant_id: merchant.id,
      store_name: merchant.store_name,
      whatsapp_number: merchant.whatsapp_number,
    }));
  }

  const twoWeeksAhead = new Date(Date.now() + 14 * 86400000).toISOString();

  let query = service
    .from("subscriptions")
    .select("merchant_id, tier, status, trial_ends_at, current_period_end, merchants!inner(store_name, whatsapp_number, store_status)")
    .not("merchants.whatsapp_number", "is", null);

  if (audience === "trial") {
    query = query.eq("status", "trial");
  } else if (audience === "paid") {
    query = query.neq("tier", "oshi_start").in("status", ["active", "grace"]);
  } else if (audience === "expiring_soon") {
    query = query
      .in("status", ["trial", "active"])
      .or(`trial_ends_at.lte.${twoWeeksAhead},current_period_end.lte.${twoWeeksAhead}`);
  }

  const { data } = await query;
  return (data || []).map((row) => {
    const merchant = row.merchants as unknown as {
      store_name: string;
      whatsapp_number: string | null;
    };
    return {
      merchant_id: row.merchant_id,
      store_name: merchant.store_name,
      whatsapp_number: merchant.whatsapp_number,
    };
  });
}
