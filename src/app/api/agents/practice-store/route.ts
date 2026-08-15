import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SAFETY_POLICY_VERSION } from "@/lib/safety/prohibited-content";

/**
 * Give an approved agent a practice store of their own.
 *
 * Agents were told to rehearse on the shared demo storefront, which taught
 * them only the customer half: browse, cart, checkout. The half they are
 * actually selling — orders arriving, statuses moving, WhatsApp going out
 * automatically — was invisible, because those messages only fire when a
 * MERCHANT advances an order and no agent owns that store.
 *
 * So the practice store is a real store the agent owns. They place an order
 * on their own storefront as a customer, then advance it in their own
 * dashboard as the merchant, and the WhatsApp arrives on their own phone.
 *
 * `merchants.user_id` is uniquely indexed — one store per login — so an agent
 * who is already a merchant cannot have a second one. That is fine: they
 * already know how the product works. It also gives the practice store a
 * natural end: an agent who decides to sell for real keeps this store and
 * turns it into a real one.
 *
 * is_demo = true is what keeps it harmless: no cron messages its invented
 * customers, it stays out of Browse Stores, and its orders are purged after
 * thirty days (see the payment-reminders cron).
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in first." }, { status: 401 });
  }

  const service = createServiceClient();

  // Only an approved agent, and only for themselves — the caller's identity
  // comes from the session, never from the request body.
  const { data: agent } = await service
    .from("referrers")
    .select("id, code, name, whatsapp, status, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!agent || agent.status !== "active" || !agent.is_active) {
    return NextResponse.json(
      { ok: false, error: "Only approved agents can create a practice store." },
      { status: 403 }
    );
  }

  // Idempotent: the button can be pressed twice, and a merchant may already
  // exist because the agent sells on OshiCart themselves.
  const { data: existing } = await service
    .from("merchants")
    .select("id, store_slug, is_demo")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      ok: true,
      alreadyExisted: true,
      isPractice: existing.is_demo,
      storeSlug: existing.store_slug,
    });
  }

  const slug = `practice-${agent.code}`.toLowerCase().replace(/[^a-z0-9-]/g, "");
  const firstName = (agent.name ?? "Agent").trim().split(/\s+/)[0];

  const { data: store, error: storeError } = await service
    .from("merchants")
    .insert({
      user_id: user.id,
      store_name: `${firstName}'s Practice Store`,
      store_slug: slug,
      description:
        "A practice store for showing OshiCart to shop owners. Not a real business.",
      // Their own number, so the automated messages they trigger land on the
      // phone in their hand — that is the entire point of the exercise.
      whatsapp_number: agent.whatsapp,
      industry: "retail",
      region: "khomas",
      town: "windhoek",
      accepted_payment_methods: ["cod", "eft"],
      bank_name: "Bank Windhoek",
      bank_account_number: "0000000000",
      bank_account_holder: `${firstName} (practice)`,
      enabled_delivery_providers: ["store"],
      pickup_address: "Practice store — no collections",
      delivery_fee_nad: 3000,
      store_status: "active",
      is_demo: true,
      prohibited_policy_accepted_at: new Date().toISOString(),
      prohibited_policy_version: SAFETY_POLICY_VERSION,
    })
    .select("id, store_slug")
    .single();

  if (storeError || !store) {
    console.error("[PracticeStore] create failed:", storeError);
    return NextResponse.json(
      { ok: false, error: "Could not create the practice store." },
      { status: 500 }
    );
  }

  // One of each selling mode, so the agent can demonstrate the three pitches
  // a Namibian shop owner actually asks about.
  // Every row carries the SAME keys on purpose. PostgREST unions the keys of a
  // batch insert, so a row that omits one gets an explicit NULL rather than the
  // column's DEFAULT — which fails outright against NOT NULL columns like
  // rental_min_days, and would silently null out rental settings otherwise.
  const rentalDefaults = {
    rental_unit: "day",
    rental_min_days: 1,
    rental_max_days: 30,
    rental_buffer_days: 0,
    deposit_nad: 0,
    late_fee_nad: 0,
    requires_id_number: false,
    service_mode: null as string | null,
    low_stock_threshold: 5,
  };

  const seeded = [
    {
      ...rentalDefaults,
      item_type: "product",
      name: "Practice T-Shirt",
      description: "A physical product. Stock goes down when it sells.",
      price_nad: 15000,
      track_inventory: true,
      stock_quantity: 10,
      low_stock_threshold: 3,
    },
    {
      ...rentalDefaults,
      item_type: "service",
      service_mode: "at_store",
      name: "Practice Haircut",
      description: "A service. The customer picks a date and time at checkout.",
      price_nad: 12000,
      track_inventory: false,
      stock_quantity: 0,
    },
    {
      ...rentalDefaults,
      item_type: "rental",
      name: "Practice Camping Tent",
      description:
        "A hire. The customer picks dates, the price works itself out, and the deposit comes back on return.",
      price_nad: 15000,
      track_inventory: false,
      stock_quantity: 2,
      rental_max_days: 14,
      deposit_nad: 50000,
      late_fee_nad: 5000,
    },
  ].map((p) => ({
    ...p,
    merchant_id: store.id,
    is_available: true,
    moderation_status: "approved",
    moderation_checked_at: new Date().toISOString(),
    moderation_source: "practice_store",
  }));

  const { error: seedError } = await service.from("products").insert(seeded);
  if (seedError) {
    // The store is usable without the samples; say so rather than pretending
    // it failed, and rather than pretending it fully worked.
    console.error("[PracticeStore] seeding failed:", seedError);
    return NextResponse.json({
      ok: true,
      storeSlug: store.store_slug,
      seeded: false,
    });
  }

  return NextResponse.json({ ok: true, storeSlug: store.store_slug, seeded: true });
}
