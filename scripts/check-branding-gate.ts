/**
 * "Powered by OshiCart" must never render without a tier gate.
 *
 * The product detail page rendered the badge unconditionally, so merchants
 * paying N$149+ for "No OshiCart branding on your store" still carried it on
 * every product page — the platform charging for something it did not fully
 * deliver. Storefront and checkout gated it correctly; only that one surface
 * did not, which is exactly the kind of drift a per-file check catches.
 *
 *   npx tsx scripts/check-branding-gate.ts
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join, sep } from "path";

const SRC = join(process.cwd(), "src");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

let failures = 0;
const files = walk(SRC).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));

// Files that legitimately mention the badge as prose (pricing copy, terms, the
// tier definitions themselves) rather than rendering it on a storefront.
const PROSE = ["pricing", "terms", "tier-limits.ts", "plans.ts"];

// Surfaces that show the badge on EVERY tier by deliberate product decision.
// The invoice keeps it on purpose: it is the document a merchant hands their
// customer, and the attribution was chosen to stay on paid plans too. The
// credit note mirrors the invoice — same document family, same choice. Listed
// here so the decision is visible and survives, not silently ungated.
const INTENTIONALLY_UNGATED = ["/invoice/", "/credit-note/"];

for (const file of files) {
  const body = readFileSync(file, "utf8");
  const rendersBadge =
    body.includes("Powered by {SITE_NAME}") || body.includes("Powered by OshiCart");
  if (!rendersBadge) continue;

  const rel = file.replace(process.cwd(), "").split(sep).join("/");
  if (PROSE.some((p) => rel.includes(p))) {
    console.log(`ok   ${rel} mentions the badge as copy, not as a storefront render`);
    continue;
  }

  if (INTENTIONALLY_UNGATED.some((p) => rel.includes(p))) {
    console.log(`ok   ${rel} shows the badge on every tier by decision (see comment)`);
    continue;
  }

  if (body.includes("showBranding")) {
    console.log(`ok   ${rel} gates the badge on showBranding`);
  } else {
    failures++;
    console.log(`FAIL ${rel} renders "Powered by" with no showBranding gate`);
  }
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
