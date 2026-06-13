import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("./merchant-guide.html", import.meta.url), "utf8");
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({
  path: "public/oshicart-merchant-guide.pdf",
  format: "A4",
  printBackground: true,
  margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" },
});
await browser.close();
console.log("Wrote public/oshicart-merchant-guide.pdf");
