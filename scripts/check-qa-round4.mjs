import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
process.on("uncaughtException", (error) => {
  console.error("FAIL", error.message, error.detail ?? "", error.where ?? "");
  process.exit(1);
});

const require = createRequire(import.meta.url);
function loadTs(path, mocks = {}) {
  const code = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  new Function("require", "module", "exports", code)(
    (id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id), mod, mod.exports);
  return mod.exports;
}
let checks = 0;
const ok = (name) => { checks++; console.log("PASS", name); };

for (const form of ["new", "[id]/edit"]) {
  const source = readFileSync(`src/app/(dashboard)/dashboard/products/${form}/page.tsx`, "utf8");
  assert.match(source, /aria-label="Track Inventory"/);
  assert.match(source, /peer-focus-visible:outline-2/, `${form}: inventory switch needs visible keyboard focus`);
  assert.match(source, /className="peer sr-only"/);
}
ok("Inventory switches have a name and visible keyboard focus styling");

const utils = loadTs("src/lib/utils.ts");
const quote = loadTs("src/lib/quote.ts");
assert.equal(quote.isQuoteRequired({ price_nad: 0 }), true);
assert.equal(quote.isQuoteRequired({ price_nad: 0, has_variants: true }), false);
assert.equal(quote.isQuoteRequired({ price_nad: 100 }), false);
assert.equal(utils.normalizeNamibianPhone("0812384424"), utils.normalizeNamibianPhone("+264812384424"));
ok("Quote/variant distinction and local/international phone equality");

const vat = loadTs("src/lib/vat.ts");
const announce = readFileSync("src/app/api/orders/announce/route.ts", "utf8");
const projection = announce.match(/\.select\(`([\s\S]*?)`\)/)[1];
for (const order of [
  { subtotal_nad: 30000, vat_nad: 4500, vat_inclusive: false, deposit_nad: 50000 },
  { subtotal_nad: 30000, callout_fee_nad: 5000 },
  { subtotal_nad: 30000, vat_nad: 3913, vat_inclusive: true, discount_nad: 1000, delivery_fee_nad: 2000 },
]) {
  const selected = Object.fromEntries(Object.entries(order).filter(([key]) => projection.includes(key)));
  assert.equal(vat.getOrderPayableTotal(selected), vat.getOrderPayableTotal(order));
}
ok("Announcement projection preserves rental/call-out/VAT/discount/delivery totals");

const funnel = loadTs("src/lib/funnel-event.ts");
const event = { event: "checkout_completed", session_id: "00000000-0000-4000-8000-000000000001", pathname: "/track/secret-token?phone=secret", phone: "private" };
assert.deepEqual(funnel.parseFunnelEvent(event), { event: event.event, session_id: event.session_id, pathname: "/track/[id]" });
assert.equal(funnel.parseFunnelEvent({ ...event, event: "invented" }), null);
assert.equal(funnel.parseFunnelEvent({ ...event, session_id: "bad" }), null);
ok("Analytics validates events and strips capabilities/extra personal data");
assert.equal(funnel.isTrustedFunnelOrigin("http://127.0.0.1:3100", "http://localhost:3100/api/analytics/event", "http://127.0.0.1:3100"), true);
assert.equal(funnel.isTrustedFunnelOrigin("https://oshicart.com", "http://internal:3000/api/analytics/event", "https://oshicart.com"), true);
assert.equal(funnel.isTrustedFunnelOrigin("https://attacker.test", "https://attacker.test/api/analytics/event", "https://oshicart.com"), false);
assert.equal(funnel.isTrustedFunnelOrigin("null", "http://localhost:3100/api/analytics/event", "http://127.0.0.1:3100"), false);
assert.equal(funnel.isTrustedFunnelOrigin("https://oshicart.com", "http://internal", "invalid"), false);
ok("Funnel origin accepts configured public host behind a proxy and rejects untrusted origins");

function fakeDb({ demo = false, history = [], historyError = false, merchantError = false } = {}) {
  const rows = [...history];
  return {
    rows,
    from(table) {
      const filters = [];
      let inserted, updated;
      const query = {
        select() { return query; },
        eq(key, value) { filters.push([key, value]); return query; },
        // The low-stock guard scopes history to the current Namibian month, so
        // the fake builder has to understand range filters as well as equality.
        gte(key, value) { filters.push([key, value, ">="]); return query; },
        lt(key, value) { filters.push([key, value, "<"]); return query; },
        limit() { return query; },
        insert(value) { inserted = value; return query; },
        update(value) { updated = value; return query; },
        maybeSingle() { return execute(true); },
        single() { return execute(true); },
        then(resolve, reject) { return execute(false).then(resolve, reject); },
      };
      async function execute(single) {
        if (table === "merchants") return { data: merchantError ? null : { is_demo: demo }, error: merchantError ? { code: "test" } : null };
        if (inserted) {
          if (rows.some((r) => r.event_key === inserted.event_key)) return { data: null, error: { code: "23505" } };
          const row = { ...inserted, id: String(rows.length + 1) };
          rows.push(row);
          return { data: row, error: null };
        }
        const found = rows.filter((r) => filters.every(([key, value, op]) => {
          if (op === ">=") return r[key] === undefined || String(r[key]) >= String(value);
          if (op === "<") return r[key] === undefined || String(r[key]) < String(value);
          return r[key] === value;
        }));
        if (updated) found.forEach((r) => Object.assign(r, updated));
        return { data: single ? found[0] ?? null : found, error: historyError ? { code: "test" } : null };
      }
      return query;
    },
  };
}
let sends = 0;
const messaging = loadTs("src/lib/whatsapp-events.ts", {
  "@/lib/date": loadTs("src/lib/date.ts"),
  "@/lib/supabase/service": { createServiceClient: () => { throw new Error("Real database forbidden"); } },
  "@/lib/whatsapp": { isWhatsAppEnabled: () => true, sendWhatsAppTemplate: async () => { sends++; return { success: true, messageId: "test" }; } },
  "@/lib/whatsapp-templates": { getWhatsAppTemplate: () => ({ recipientType: "merchant", category: "utility" }), validateWhatsAppTemplatePayload: () => null },
});
const stockInput = (db, day) => ({ supabase: db, merchantId: "store", eventKey: "low_stock_alert:store:" + day, templateName: "low_stock_alert", recipientPhone: "+264812384424", variables: ["Store", "Item", "1"] });
const db = fakeDb();
await Promise.all([messaging.sendWhatsAppEvent(stockInput(db, "day1")), messaging.sendWhatsAppEvent(stockInput(db, "day1"))]);
assert.equal(sends, 1);
await messaging.sendWhatsAppEvent(stockInput(db, "day2"));
await messaging.sendWhatsAppEvent({ ...stockInput(db, "day3"), variables: ["Store", "Different product", "0"] });
assert.equal(sends, 1);
const monthKey = loadTs("src/lib/date.ts").namibianMonthKey();
assert.equal(db.rows[0].event_key, `low_stock_alert:store:${monthKey}`);
ok("Concurrent first alerts send once; later days/products/quantities do not reset");
for (const status of ["queued", "sent", "delivered", "read", "failed"]) {
  await messaging.sendWhatsAppEvent(stockInput(fakeDb({ history: [{ id: "old", merchant_id: "store", template_name: "low_stock_alert", event_key: "legacy-product-key", status }] }), "today"));
}
await messaging.sendWhatsAppEvent(stockInput(fakeDb({ historyError: true }), "today"));
await messaging.sendWhatsAppEvent(stockInput(fakeDb({ merchantError: true }), "today"));
await messaging.sendWhatsAppEvent(stockInput(fakeDb({ demo: true }), "today"));
await messaging.sendWhatsAppEvent({ ...stockInput(fakeDb({ demo: true }), "today"), templateName: "order_confirmed" });
assert.equal(sends, 1);
ok("Legacy alerts remain consumed; history errors and demo stores never send");

// Route-level checks use fixture clients and fake transports only.
function fixtureClient(tables) {
  return { from(table) {
    const filters = [];
    const q = {
      select() { return q; },
      eq(key, value) { filters.push([key, value]); return q; },
      async single() { return q.maybeSingle(); },
      async maybeSingle() { return { data: (tables[table] ?? []).find(row => filters.every(([k,v]) => row[k] === v)) ?? null, error: null }; },
    };
    return q;
  } };
}
const merchantRows = [
  { id: "store-a", user_id: "owner", whatsapp_number: "+264812384424" },
  { id: "store-b", user_id: "other-owner", whatsapp_number: "+264812000002" },
];
const orderRows = [
  { id: "order-a", merchant_id: "store-a", customer_whatsapp: "+264812000003" },
  { id: "order-b", merchant_id: "store-b", customer_whatsapp: "+264812000004" },
];
const routeDb = fixtureClient({ merchants: merchantRows, orders: orderRows });
let routeSends = [], transportOk = true;
const notifyRoute = loadTs("src/app/api/whatsapp/notify/route.ts", {
  "@/lib/supabase/server": { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) } }) },
  "@/lib/supabase/service": { createServiceClient: () => routeDb },
  "@/lib/utils": utils,
  "@/lib/whatsapp-events": { sendWhatsAppEvent: async input => { routeSends.push(input); return { ok: transportOk }; } },
});
const notifyBody = { merchant_id: "store-a", template_name: "store_welcome", recipient_phone: "0812384424", variables: ["Store"] };
const notify = body => notifyRoute.POST({ json: async () => body });
assert.equal((await notify(notifyBody)).status, 200);
assert.equal(routeSends[0].recipientPhone, "+264812384424");
assert.equal((await notify({ ...notifyBody, recipient_phone: "+264812384424" })).status, 200);
assert.equal((await notify({ ...notifyBody, recipient_phone: "0812000003" })).status, 403);
assert.equal((await notify({ ...notifyBody, merchant_id: "store-b" })).status, 403);
assert.equal((await notify({ ...notifyBody, order_id: "order-b" })).status, 404);
assert.equal((await notify({ ...notifyBody, order_id: "order-a", recipient_phone: "0812000003" })).status, 200);
transportOk = false;
assert.equal((await notify(notifyBody)).status, 502);
ok("Notification route accepts equivalent phones, denies cross-owner recipients, surfaces transport failure");

let forwarded = [], fallback = [], signatureValid = true;
const replyDb = fixtureClient({ merchants: merchantRows, orders: orderRows, whatsapp_messages: [
  { meta_message_id: "meta-a", merchant_id: "store-a", order_id: "order-a", recipient_type: "customer", recipient_phone: "+264812000003" },
  { meta_message_id: "meta-b", merchant_id: "store-b", order_id: "order-b", recipient_type: "customer", recipient_phone: "+264812000004" },
] });
const webhook = loadTs("src/app/api/whatsapp/webhook/route.ts", {
  "@/lib/supabase/service": { createServiceClient: () => replyDb },
  "@/lib/utils": utils,
  "@/lib/whatsapp": { verifyWebhookSignature: async () => signatureValid, sendWhatsAppTemplate: async (...args) => { fallback.push(args); return { success: true }; } },
  "@/lib/whatsapp-events": { adminWhatsAppNumbers: () => ["+264819999999"], sendWhatsAppEvent: async input => { forwarded.push(input); return { ok: transportOk }; } },
});
const reply = (from, context) => webhook.POST({ headers: new Headers(), text: async () => JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ id: "reply-" + context, from, context: { id: context }, type: "text", text: { body: "Is it ready?" } }] } }] }] }) });
transportOk = true;
assert.equal((await reply("264812000003", "meta-a")).status, 200);
assert.equal((await reply("264812000004", "meta-b")).status, 200);
assert.deepEqual(forwarded.map(x => [x.merchantId, x.orderId, x.recipientPhone]), [["store-a", "order-a", merchantRows[0].whatsapp_number], ["store-b", "order-b", merchantRows[1].whatsapp_number]]);
assert.equal(fallback.length, 0);
await reply("264812000003", "meta-b");
assert.equal(forwarded.length, 2);
assert.equal(fallback.length, 1);
signatureValid = false;
assert.equal((await reply("264812000003", "meta-a")).status, 401);
signatureValid = true; transportOk = false;
assert.equal((await reply("264812000003", "meta-a")).status, 503);
ok("Signed reply context routes two merchants independently; mismatches never route to another merchant");

// Embedded Postgres, not a production connection. Install the optional test
// runtime with: npm install --prefix output/qa-runtime --no-save --package-lock=false @electric-sql/pglite
const { PGlite } = await import("../output/qa-runtime/node_modules/@electric-sql/pglite/dist/index.js");
const pg = new PGlite();
await pg.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE TYPE subscription_tier AS ENUM ('oshi_start','oshi_basic','oshi_grow','oshi_pro');
CREATE TABLE merchants(id uuid PRIMARY KEY, is_demo boolean DEFAULT false, is_active boolean DEFAULT true, store_status text DEFAULT 'active', created_at timestamptz DEFAULT now(), enabled_delivery_providers text[] DEFAULT ARRAY['store']);
CREATE TABLE subscriptions(merchant_id uuid PRIMARY KEY, tier subscription_tier, status text, current_period_start timestamptz, created_at timestamptz DEFAULT now());
CREATE TABLE tier_limits(tier subscription_tier PRIMARY KEY, max_orders_per_month int);
INSERT INTO tier_limits VALUES ('oshi_start',2),('oshi_basic',50),('oshi_grow',300),('oshi_pro',-1);
CREATE TABLE orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),merchant_id uuid,status text DEFAULT 'pending',created_at timestamptz DEFAULT now(),delivery_method text DEFAULT 'pickup',delivery_provider text DEFAULT 'store',subtotal_nad integer DEFAULT 100,delivery_fee_nad integer DEFAULT 0,discount_nad integer DEFAULT 0,vat_nad integer DEFAULT 0,vat_inclusive boolean DEFAULT false);
CREATE TABLE products(id uuid PRIMARY KEY,merchant_id uuid,item_type text DEFAULT 'product',rental_unit text);
CREATE TABLE order_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid,product_id uuid,product_price int);
`);
const migration = readFileSync("supabase/migrations/20260905062808_qa_round4_commerce_guards.sql", "utf8");
await pg.exec(migration);
const merchant = "00000000-0000-4000-8000-000000000001";
const product = "00000000-0000-4000-8000-000000000002";
await pg.exec(`INSERT INTO merchants(id,enabled_delivery_providers) VALUES ('${merchant}', '{}');
INSERT INTO products(id,merchant_id) VALUES ('${product}','${merchant}');
INSERT INTO subscriptions(merchant_id,tier,status) VALUES ('${merchant}','oshi_start','active');`);
async function order(price = 100, method = "pickup", finalProvider = null) {
  return pg.transaction(async (tx) => {
    const result = await tx.query("INSERT INTO orders(merchant_id,delivery_method) VALUES ($1,$2) RETURNING id", [merchant, method]);
    const id = result.rows[0].id;
    await tx.query("INSERT INTO order_items(order_id,product_id,product_price) VALUES ($1,$2,$3)", [id, product, price]);
    if (finalProvider) await tx.query("UPDATE orders SET delivery_provider=$1 WHERE id=$2", [finalProvider, id]);
    return id;
  });
}
await assert.rejects(() => order(0), /requires a quote/);
await assert.rejects(() => order(100, "delivery"), /does not offer/);
const first = await order();
await order();
await assert.rejects(() => order(), /order allowance/);
await pg.query("UPDATE orders SET status='cancelled' WHERE id=$1", [first]);
await order();
ok("Database rejects quote-only/free items and pickup-only delivery; quota excludes cancellations");
await pg.exec(`UPDATE subscriptions SET tier='oshi_pro'; UPDATE merchants SET pickup_enabled=false, enabled_delivery_providers=ARRAY['yango'];`);
await assert.rejects(() => order(), /does not offer pickup/);
await assert.rejects(() => order(100, "delivery", "store"), /does not offer/);
await order(100, "delivery", "yango");
await pg.exec("UPDATE products SET item_type='service'");
await order(); // online/service fulfilment is not goods pickup
ok("Deferred provider guard accepts final courier update; services are not goods pickup");
await pg.exec("UPDATE subscriptions SET status='soft_suspended'");
await assert.rejects(() => order(), /not currently accepting/);
const availability = await pg.query("SELECT * FROM get_store_orderability(ARRAY[$1::uuid])", [merchant]);
assert.equal(availability.rows[0].ordering_available, false);
ok("Suspension is enforced at insertion and represented in marketplace availability");
await pg.exec("UPDATE subscriptions SET status='active'");
assert.equal((await pg.query("SELECT * FROM get_store_orderability(ARRAY[$1::uuid])", [merchant])).rows[0].ordering_available, true);
await pg.exec("UPDATE orders SET subtotal_nad=1000000 WHERE status <> 'cancelled'");
assert.equal((await pg.query("SELECT * FROM get_store_orderability(ARRAY[$1::uuid])", [merchant])).rows[0].ordering_available, false);
await pg.exec("UPDATE orders SET subtotal_nad=100");
for (let i = 0; i < 10; i++) await order();
assert.equal((await pg.query("SELECT * FROM get_store_orderability(ARRAY[$1::uuid])", [merchant])).rows[0].ordering_available, false);
await pg.exec("UPDATE merchants SET created_at=now()-interval '31 days'");
assert.equal((await pg.query("SELECT * FROM get_store_orderability(ARRAY[$1::uuid])", [merchant])).rows[0].ordering_available, true);
ok("Marketplace respects first-month count/value caps and their age boundary");
const period = await pg.query("SELECT * FROM private.qa_billing_period('2026-01-31 12:00+02','2026-02-28 12:00+02')");
assert.equal(new Date(period.rows[0].start_at).toISOString(), "2026-02-27T22:00:00.000Z");
assert.equal(new Date(period.rows[0].end_at).toISOString(), "2026-03-30T22:00:00.000Z");
ok("Database billing boundaries clamp February while retaining day-31 anchor");
for (let i = 0; i < 30; i++) await pg.query("SELECT record_funnel_event('checkout_started',$1,'/checkout')", [merchant]);
const limited = await pg.query("SELECT record_funnel_event('checkout_started',$1,'/checkout') AS accepted", [merchant]);
assert.equal(limited.rows[0].accepted, false);
const access = await pg.query("SELECT has_table_privilege('anon','funnel_events','SELECT') AS can_read, has_function_privilege('anon','record_funnel_event(text,uuid,text)','EXECUTE') AS can_write");
assert.equal(access.rows[0].can_read, false);
assert.equal(access.rows[0].can_write, false);
ok("Funnel persistence rate cap and anonymous privilege denial");
await pg.close();
console.log(`PASS: ${checks} QA regression groups; no external messages or production writes.`);
