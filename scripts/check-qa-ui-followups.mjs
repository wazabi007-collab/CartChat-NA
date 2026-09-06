import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
function load(path, mocks = {}) {
  const code = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function("require", "module", "exports", code)((id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id), mod, mod.exports);
  return mod.exports;
}
const { trackingSteps } = load("src/lib/tracking-steps.ts");
assert.deepEqual(trackingSteps(false, "confirmed"), ["pending", "confirmed", "completed"]);
assert.equal(trackingSteps(true, "pending").includes("ready"), true);
assert.equal(trackingSteps(false, "ready").includes("ready"), true);
assert.equal(trackingSteps(false, "completed", [{ status: "ready" }]).includes("ready"), true);
console.log("PASS simple/full tracking and historical Ready preservation");
const { socialPriceLabel } = load("src/lib/quote.ts");
assert.equal(socialPriceLabel({ price_nad: 0 }), "Request a quote");
assert.equal(socialPriceLabel({ price_nad: 12500 }), "N$125.00");
assert.equal(socialPriceLabel({ price_nad: 0, product_variants: [{ price_nad: 1200, is_available: true }, { price_nad: 500, is_available: false }] }), "From N$12.00");
console.log("PASS quote/fixed/available-variant social prices");

async function retryCase({ user = true, merchant = true, history = [], historyError = false, sendOk = true } = {}) {
  let sends = 0;
  const owner = { id: "store-1", store_name: "QA Store", store_slug: "qa", whatsapp_number: "264810000000" };
  const db = { from(table) {
    const q = { select() { return q; }, eq() { return q; },
      single: async () => ({ data: merchant ? owner : null }),
      in: async () => ({ data: history, error: historyError ? {} : null }) };
    assert.ok(["merchants", "whatsapp_messages"].includes(table));
    return q;
  } };
  const route = load("src/app/api/whatsapp/welcome-retry/route.ts", {
    "@/lib/supabase/server": { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: user ? { id: "owner" } : null } }) } }) },
    "@/lib/supabase/service": { createServiceClient: () => db },
    "@/lib/constants": { SITE_URL: "https://example.test" },
    "@/lib/whatsapp-events": { sendWhatsAppEvent: async (input) => {
      sends++;
      assert.equal(input.eventKey, "welcome_merchant:store-1:manual-retry");
      assert.equal(input.recipientPhone, owner.whatsapp_number);
      assert.deepEqual(input.variables, [owner.store_name, "https://example.test/s/qa"]);
      return { ok: sendOk, skipped: false };
    } },
  });
  const response = await route.POST();
  return { status: response.status, sends, body: await response.json() };
}
assert.equal((await retryCase({ user: false })).status, 401);
assert.equal((await retryCase({ merchant: false })).status, 403);
assert.equal((await retryCase({ historyError: true })).sends, 0);
for (const status of ["queued", "sent", "delivered", "read"]) {
  assert.equal((await retryCase({ history: [{ event_key: "welcome_merchant:store-1", status }] })).sends, 0);
}
assert.equal((await retryCase({ history: [{ event_key: "welcome_merchant:store-1", status: "failed" }] })).sends, 1);
assert.equal((await retryCase({ history: [{ event_key: "welcome_merchant:store-1:manual-retry", status: "failed" }] })).status, 409);
assert.equal((await retryCase({ sendOk: false })).status, 502);
console.log("PASS welcome retry ownership, fixed recipient/content/key, history, failure and retry limit (mock transport)");

for (const path of ["src/app/track/[token]/page.tsx", "src/app/api/orders/track/[token]/route.ts"]) {
  assert.match(readFileSync(path, "utf8"), /whatsapp_number, uses_ready_step, pickup_address/);
}
const stores = readFileSync("src/app/stores/page.tsx", "utf8");
assert.match(stores, /stores.filter\(\(store\) => store.orderingAvailable\)/);
assert.equal((stores.match(/params.set\("accepting", "true"\)/g) || []).length, 3);
assert.match(stores, /Include paused stores/);
assert.match(readFileSync("src/components/dashboard/product-variants-editor.tsx", "utf8"), /<details[\s\S]*<summary/);
assert.match(readFileSync("src/app/(dashboard)/dashboard/setup/page.tsx", "utf8"), /pricing\/checkout\?tier=\$\{tierParam\}\$\{welcomeResult/);
console.log("PASS tracking projections, filter retention/empty state, native preset disclosure and plan warning redirect wiring");
