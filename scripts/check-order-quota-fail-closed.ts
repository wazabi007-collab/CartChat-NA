/**
 * A quota the database refused to answer is not a quota of zero.
 *
 * Both queries behind the monthly order allowance discarded their `error` and
 * turned it into `0`: the subscription lookup fell back to a calendar-month
 * anchor, and the order count did `return count || 0`, where a failed query
 * returns null. So a timeout, a permission regression, or a schema mismatch
 * produced "0 orders used, limit not reached" — indistinguishable from a store
 * that genuinely had a quiet month.
 *
 * That is not cosmetic. place_order only enforces a 10-order anti-fraud window
 * on merchants younger than 30 days; the TIER allowance is enforced nowhere
 * else. These two functions are the only gate, so failing open let a capped
 * store keep taking orders past the plan it paid for, while its dashboard
 * calmly reported zero.
 *
 * This is the same class that once emptied Browse Stores for every shopper: a
 * denied column read as "no rows". The rule that came out of it holds here —
 * an empty result is a real answer, a failed query is not.
 *
 *   npx tsx scripts/check-order-quota-fail-closed.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SOURCE = "src/lib/order-limit.ts";
const body = readFileSync(join(process.cwd(), SOURCE), "utf8");

let failures = 0;
const fail = (m: string) => {
  console.error(`  FAIL  ${m}`);
  failures++;
};
const pass = (m: string) => console.log(`  ok    ${m}`);

// ── 1. Every Supabase read here must inspect its error ──────────────────
// `const { data } = await` / `const { count } = await` discard it by omission.
const blindReads = [
  ...body.matchAll(/const\s*\{\s*([^}]*)\}\s*=\s*await\s+supabase/g),
];
if (blindReads.length === 0) {
  fail(`${SOURCE}: expected Supabase reads here — has the file moved?`);
}
for (const m of blindReads) {
  const destructured = m[1];
  if (!/\berror\b/.test(destructured)) {
    fail(
      `${SOURCE}: a query destructures {${destructured.trim()}} without \`error\`.\n` +
        `        A refused query would be read as an empty allowance.`
    );
  }
}
if (blindReads.length > 0 && failures === 0) {
  pass(`all ${blindReads.length} quota queries inspect their error`);
}

// ── 2. `count || 0` is how null became zero ─────────────────────────────
if (/return\s+count\s*\|\|\s*0/.test(body)) {
  fail(
    `${SOURCE}: \`return count || 0\` turns a failed count into a real zero.\n` +
      `        Check the error first, then trust the number.`
  );
} else {
  pass("a null count is never coerced to zero");
}

// ── 3. The failure has to actually stop something ──────────────────────
if (!/throw new Error/.test(body)) {
  fail(
    `${SOURCE}: nothing throws. An unanswerable quota must fail loudly rather\n` +
      `        than resolving to a permissive default.`
  );
} else {
  pass("an unanswerable quota throws instead of defaulting");
}

// ── 4. Public pages must not ask the quota with an anonymous client ─────
// subscriptions and orders both have RLS with no anon policy. A public
// visitor's client does not get an error for them -- it gets zero rows and a
// null error, which read as "no subscription, 0 orders used". So the tier cap
// was not merely fragile on the storefront, product page and checkout: it was
// never enforced there at all. Octovia had 16 orders; anon counted 0.
// The tier lookup on the storefront already carries a comment about exactly
// this trap; the quota walked into it by a different door.
const PUBLIC_QUOTA_PAGES = [
  "src/app/s/[slug]/page.tsx",
  "src/app/s/[slug]/[productId]/page.tsx",
  "src/app/checkout/[slug]/page.tsx",
];

for (const page of PUBLIC_QUOTA_PAGES) {
  const src = readFileSync(join(process.cwd(), page), "utf8");
  const calls = [
    ...src.matchAll(/(?:isOrderLimitReached|getOrderQuota)\(\s*([A-Za-z_$][\w$]*(?:\(\))?)/g),
  ];
  if (calls.length === 0) {
    fail(`${page}: expected an order-quota call here — has the gate been removed?`);
    continue;
  }
  for (const c of calls) {
    const client = c[1];
    if (!/^(createServiceClient\(\)|service)$/.test(client)) {
      fail(
        [
          `${page}: asks the quota with \`${client}\`, not the service client.`,
          "        A public visitor cannot read subscriptions or orders, and RLS",
          "        returns zero rows with NO error — so the cap silently vanishes.",
        ].join("\n")
      );
    } else {
      pass(`${page} asks the quota with the service client`);
    }
  }
}

console.log(
  failures === 0
    ? "\nPASS  The order quota fails closed."
    : `\nFAIL  ${failures} problem(s).`
);
process.exit(failures === 0 ? 0 : 1);
