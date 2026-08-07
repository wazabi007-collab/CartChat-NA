/**
 * Builds the referral agent handbook PDF.
 *
 * The previous handbook was generated ad-hoc and its source was never kept, so
 * it could not be updated when the platform changed. This mirrors
 * generate-guide-pdf.mjs so both documents stay reproducible:
 *
 *   node scripts/generate-handbook-pdf.mjs
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const logo = readFileSync("public/oshicart-logo-v3.png").toString("base64");
const html = readFileSync(new URL("./referral-handbook.html", import.meta.url), "utf8")
  .replace("__LOGO__", `data:image/png;base64,${logo}`);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({
  path: "public/oshicart-referral-agent-handbook.pdf",
  format: "A4",
  printBackground: true,
  margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" },
});
await browser.close();
console.log("Wrote public/oshicart-referral-agent-handbook.pdf");
