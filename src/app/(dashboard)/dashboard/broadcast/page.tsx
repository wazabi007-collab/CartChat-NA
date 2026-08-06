import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SITE_URL } from "@/lib/constants";
import { BroadcastClient } from "./broadcast-client";

export interface BroadcastCustomer {
  id: string;
  whatsapp: string;
  name: string | null;
  marketing_opt_out: boolean;
  completed_orders: number;
  last_order_at: string | null;
}

export interface BroadcastTemplate {
  id: string;
  merchant_id: string | null;
  name: string;
  body: string;
}

export default async function BroadcastPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, store_name, store_slug, pickup_address")
    .eq("user_id", user.id)
    .single();
  if (!merchant) redirect("/dashboard/setup");

  const [{ data: customerRows }, { data: templates }, { data: sends }] = await Promise.all([
    supabase.rpc("get_merchant_customers", { p_merchant_id: merchant.id }),
    supabase
      .from("broadcast_templates")
      .select("id, merchant_id, name, body")
      .order("merchant_id", { nullsFirst: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("broadcast_sends")
      .select("customer_id, sent_at")
      .eq("merchant_id", merchant.id)
      .gte("sent_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const customers: BroadcastCustomer[] = ((customerRows ?? []) as BroadcastCustomer[]).map((c) => ({
    id: c.id,
    whatsapp: c.whatsapp,
    name: c.name,
    marketing_opt_out: c.marketing_opt_out,
    completed_orders: Number(c.completed_orders || 0),
    last_order_at: c.last_order_at,
  }));

  // Customers messaged in the last 30 days — shown so a merchant doesn't
  // unknowingly message the same person twice in quick succession.
  const recentlyMessaged = new Set((sends ?? []).map((s) => s.customer_id as string));

  return (
    <BroadcastClient
      merchantId={merchant.id}
      storeName={merchant.store_name}
      storeUrl={`${SITE_URL}/s/${merchant.store_slug}`}
      pickupAddress={merchant.pickup_address}
      customers={customers}
      templates={(templates ?? []) as BroadcastTemplate[]}
      recentlyMessagedIds={Array.from(recentlyMessaged)}
    />
  );
}
