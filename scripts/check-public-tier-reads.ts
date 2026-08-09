/**
 * Public pages must not read `subscriptions` with the visitor's client.
 *
 * subscriptions carries RLS with no anon policy — correctly, it is billing
 * data. But the storefront, product page and checkout all read it with the
 * visitor client, got NULL, and fell back to `oshi_start` for every store.
 * Two live consequences:
 *
 *   - every paying merchant still showed "Powered by OshiCart", the one thing
 *     N$149 buys
 *   - getOrderQuota / isOrderLimitReached applied the FREE tier's 20-order
 *     monthly cap to every store, so a paying merchant would have been blocked
 *     from taking orders at #21
 *
 * The tier gate has to be read with the service client on public pages. Only
 * tier and status are selected; no billing detail reaches the page.
 *
 *   npx tsx scripts/check-public-tier-reads.ts
 */
import { readFileSync } from "fs";
import { join } from "path";

const PUBLIC_PAGES = [
  "src/app/s/[slug]/page.tsx",
  "src/app/s/[slug]/[productId]/page.tsx",
  "src/app/checkout/[slug]/page.tsx",
];

let failures = 0;

for (const rel of PUBLIC_PAGES) {
  const body = readFileSync(join(process.cwd(), rel), "utf8");

  // Find how each subscriptions read is issued.
  const lines = body.split("\n");
  const reads = lines
    .map((line, i) => ({ line: line.trim(), n: i + 1 }))
    .filter((l) => l.line.includes('from("subscriptions")'));

  if (reads.length === 0) {
    failures++;
    console.log(`FAIL ${rel} reads no subscription at all — tier cannot be gated`);
    continue;
  }

  for (const read of reads) {
    // The read may be chained off a client created on an earlier line, so look
    // at the statement start too: `service.from(...)` or `createServiceClient().from(...)`.
    const context = lines.slice(Math.max(0, read.n - 4), read.n + 1).join(" ");
    const usesService =
      context.includes("createServiceClient()") ||
      /\bservice\s*$|\bservice\s*\./.test(context) ||
      context.includes("await service");
    if (usesService) {
      console.log(`ok   ${rel}:${read.n} reads tier with the service client`);
    } else {
      failures++;
      console.log(
        `FAIL ${rel}:${read.n} reads subscriptions with the visitor client — ` +
          `RLS returns NULL and every store falls back to the free tier`
      );
    }
  }
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
