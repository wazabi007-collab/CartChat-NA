import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const B = "../brand/";
const b64 = (p) => "data:image/png;base64," + readFileSync(p).toString("base64");

const html = readFileSync(new URL("./oshicart-ci-manual.html", import.meta.url), "utf8")
  .replaceAll("__IMG_HORIZ__", b64(B + "logo-horizontal-2x.png"))
  .replaceAll("__IMG_HORIZ_DARK__", b64(B + "logo-horizontal-dark-2x.png"))
  .replaceAll("__IMG_STACKED__", b64(B + "logo-stacked-2x.png"))
  .replaceAll("__IMG_MARK__", b64(B + "mark-512.png"));

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({
  path: B + "OshiCart-CI-Manual.pdf",
  format: "A4",
  printBackground: true,
  margin: { top: "14mm", bottom: "14mm", left: "14mm", right: "14mm" },
});
await browser.close();
console.log("Wrote brand/OshiCart-CI-Manual.pdf");
