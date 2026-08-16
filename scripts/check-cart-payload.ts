/**
 * A cart line is built in one place, never hand-written at a call site.
 *
 * Seven places built the addItem payload by hand and every one had drifted to
 * a different subset. The storefront grid sent id/name/price/image; the five
 * themed layouts added serviceMode; only the product detail page passed the
 * full set. So a hire added from ANY storefront reached checkout with no
 * `itemType` — no date picker, no deposit, one day's price — and then
 * place_order refused the order for missing hire dates the customer had never
 * been offered. Rentals worked only if you happened to open the product page.
 *
 * The failure mode is silent and it recurs every time CartItem grows: adding a
 * field updates one call site and quietly skips six. So addItem must be called
 * with cartItemFromProduct (or a variable built from it), never a literal.
 *
 *   npx tsx scripts/check-cart-payload.ts
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/** Where the builder itself lives — the one file allowed to name the fields. */
const BUILDER = "src/components/storefront/cart-provider.tsx";

let failures = 0;
let callSites = 0;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

for (const file of walk(join(process.cwd(), "src"))) {
  const rel = relative(process.cwd(), file).replace(/\\/g, "/");
  if (rel === BUILDER) continue;

  const body = readFileSync(file, "utf8");
  if (!body.includes("addItem(")) continue;

  // Every addItem call, with enough of what follows to see its argument.
  for (const match of body.matchAll(/addItem\(\s*([\s\S]{0,40})/g)) {
    const arg = match[1].trimStart();
    // Skip the context type/prop declarations, which are not calls.
    if (/^\w+\??:\s/.test(arg) || arg.startsWith(")")) continue;
    callSites++;

    if (arg.startsWith("{")) {
      const line = body.slice(0, match.index).split("\n").length;
      failures++;
      console.log(
        `FAIL ${rel}:${line}\n` +
        `  addItem is called with an object literal. Use cartItemFromProduct(product)\n` +
        `  so a hire keeps its itemType, deposit and hire limits — a literal here is\n` +
        `  how rentals reached checkout with no dates and were refused on submit.`
      );
    }
  }
}

if (callSites === 0) {
  failures++;
  console.log("FAIL found no addItem call sites — the pattern has drifted");
} else {
  console.log(`ok   ${callSites} addItem call site(s), none hand-written`);
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
