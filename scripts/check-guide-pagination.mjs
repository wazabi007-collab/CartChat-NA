/**
 * No guide section may be taller than one printed page.
 *
 * QA reported page 8 of the merchant PDF starting mid-sentence — the top of a
 * line sliced off by the page edge — and two rounds of CSS guesses failed to
 * fix it, because the cause was structural rather than stylistic.
 *
 * The stylesheet sets `section { page-break-inside: avoid }`, which should move
 * a whole section to the next page rather than split it. But a section TALLER
 * than the printable band cannot be honoured, so the browser ignores the rule
 * and breaks wherever it lands — mid-line. Numbered sections 9–12 and 13–14
 * shared a single <section> element, making one 1756px block against a 1002px
 * band, and everything after it shifted unpredictably.
 *
 * Every heading now owns its section. This check enforces that invariant: keep
 * each section within a page and no line can ever be sliced, because a section
 * is atomic and nothing else spans a boundary.
 *
 *   node scripts/check-guide-pagination.mjs
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const MM = 96 / 25.4;
// Must match generate-guide-pdf.mjs: A4, 16mm top and bottom, 14mm sides.
const BAND = (297 - 16 * 2) * MM;
const WIDTH = (210 - 14 * 2) * MM;

const logo = readFileSync("public/oshicart-logo-v3.png").toString("base64");
const html = readFileSync("scripts/merchant-guide.html", "utf8")
  .replace("__LOGO__", `data:image/png;base64,${logo}`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Math.round(WIDTH), height: 900 } });
await page.setContent(html, { waitUntil: "networkidle" });
await page.emulateMedia({ media: "print" });

const blocks = await page.evaluate(() =>
  [...document.querySelectorAll("section, .help")].map((el) => ({
    height: Math.round(el.getBoundingClientRect().height),
    heading: (el.querySelector("h2")?.textContent || el.tagName).trim().slice(0, 50),
  }))
);
await browser.close();

const band = Math.round(BAND);
const oversized = blocks.filter((b) => b.height > band);

console.log(`Printable band: ${band}px · ${blocks.length} unbreakable block(s)`);
if (oversized.length === 0) {
  const tallest = blocks.reduce((a, b) => (b.height > a.height ? b : a));
  console.log(`ok   tallest is ${tallest.height}px ("${tallest.heading}") — fits\n\nALL PASS`);
  process.exit(0);
}

for (const b of oversized) {
  console.log(
    `FAIL "${b.heading}" is ${b.height}px, taller than the ${band}px page band.\n` +
    `  page-break-inside: avoid cannot be honoured, so the browser will split it\n` +
    `  mid-line. Give each numbered heading its own <section>.`
  );
}
console.log(`\n${oversized.length} FAILURE(S)`);
process.exit(1);
