/**
 * The cart-line builder must live in a module a SERVER component can call.
 *
 * cartItemFromProduct is a pure function, but it was defined inside
 * cart-provider.tsx — a "use client" module. Next turns every export of a
 * client module into a client *reference*: server components may render those
 * as components, never invoke them. So the product detail page, a server
 * component, called it and the render threw:
 *
 *   Error: Attempted to call cartItemFromProduct() from the server but
 *   cartItemFromProduct is on the client.
 *
 * Every product page on every store broke on click-through — and the failure
 * hid well. A direct page load returned 200 with the product in the HTML;
 * only the RSC render used for client-side navigation threw, which is exactly
 * what a shopper does when they tap a product in a storefront. Checking for
 * "server-side exception" in fetched HTML found nothing, because that text is
 * produced by the client error boundary after hydration.
 *
 * So: the builder and its types belong in a plain module with no "use client",
 * importable from both sides, and nobody may import it from the provider.
 *
 *   npx tsx scripts/check-server-safe-cart-item.ts
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/** Where the pure builder must live — no "use client" allowed here. */
const HOME = "src/lib/cart-item.ts";
/** The client module it used to live in. Nobody may import the builder here. */
const PROVIDER = "src/components/storefront/cart-provider";

let failures = 0;

function fail(msg: string) {
  console.error(`  FAIL  ${msg}`);
  failures++;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

// ── 1. The builder lives in a server-safe module ────────────────────────
let home = "";
try {
  home = readFileSync(join(process.cwd(), HOME), "utf8");
} catch {
  fail(`${HOME} does not exist — the builder has no server-safe home.`);
}

if (home) {
  if (/^\s*["']use client["']/m.test(home)) {
    fail(
      `${HOME} is marked "use client".\n` +
        `        A server component cannot call a function exported from a client\n` +
        `        module — that is the bug this file exists to prevent.`
    );
  } else {
    console.log(`  ok    ${HOME} is server-safe (no "use client")`);
  }

  if (!/export function cartItemFromProduct/.test(home)) {
    fail(`${HOME} does not define cartItemFromProduct.`);
  } else {
    console.log("  ok    cartItemFromProduct is defined there");
  }
}

// ── 2. Nobody imports the builder from the client provider ──────────────
let importers = 0;
for (const file of walk(join(process.cwd(), "src"))) {
  const rel = relative(process.cwd(), file).replace(/\\/g, "/");
  const body = readFileSync(file, "utf8");

  for (const m of body.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/g)) {
    const [, names, source] = m;
    if (!names.includes("cartItemFromProduct")) continue;
    importers++;
    const resolved = source.replace(/^\.\.?\/.*?([^/]+)$/, "$1");
    if (source.includes(PROVIDER) || resolved === "cart-provider") {
      fail(
        `${rel} imports cartItemFromProduct from the client provider.\n` +
          `        Import it from "@/lib/cart-item" so server components can call it.`
      );
    }
  }
}

if (importers === 0) {
  fail("no file imports cartItemFromProduct — the check is not looking at anything.");
} else {
  console.log(`  ok    ${importers} import site(s), none via the client provider`);
}

console.log(
  failures === 0
    ? "\nPASS  The cart-line builder is callable from the server."
    : `\nFAIL  ${failures} problem(s).`
);
process.exit(failures === 0 ? 0 : 1);
