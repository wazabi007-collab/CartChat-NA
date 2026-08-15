import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const BASE_URL = "https://oshicart.com";
const EMAIL = "demo-bakery@oshicart.invalid";
const PASSWORD = process.env.OSHICART_DEMO_PASSWORD;
if (!PASSWORD) throw new Error("Set OSHICART_DEMO_PASSWORD before recording authenticated reels.");
const START_AT = Number(process.argv[2] || 1);
const OUTPUT_DIR = resolve(process.cwd(), "output/playwright/oshicart-reels");
const RAW_DIR = resolve(OUTPUT_DIR, "raw");
const AUTH_FILE = resolve(OUTPUT_DIR, "bakery-auth.json");
const ASSET_DIR = resolve(process.cwd(), "../../marketing-captures/bakery-assets");

mkdirSync(RAW_DIR, { recursive: true });
rmSync(AUTH_FILE, { force: true });

const browser = await chromium.launch({ headless: true });

async function prepareAuth() {
  const context = await browser.newContext({ viewport: { width: 540, height: 960 } });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.getByLabel(/^Email/i).fill(EMAIL);
  await page.getByLabel(/^Password/i).fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 45_000 });
  await context.storageState({ path: AUTH_FILE });
  await context.close();
}

async function addReelChrome(page, initialCaption) {
  await page.addStyleTag({
    content: `
      #oshicart-reel-caption {
        position: fixed; z-index: 2147483646; top: 78px; left: 50%;
        transform: translateX(-50%); width: calc(100% - 32px); max-width: 500px;
        box-sizing: border-box; padding: 13px 18px; border-radius: 18px;
        color: #fff; background: linear-gradient(135deg, rgba(11,18,32,.96), rgba(43,94,167,.96));
        border: 1px solid rgba(255,255,255,.25); box-shadow: 0 12px 30px rgba(11,18,32,.30);
        text-align: center; font: 800 18px/1.25 Arial, sans-serif; letter-spacing: -.2px;
        opacity: 0; transition: opacity .35s ease, transform .35s ease;
      }
      #oshicart-reel-caption.show { opacity: 1; transform: translateX(-50%) translateY(0); }
      #oshicart-demo-pointer {
        position: fixed; z-index: 2147483647; left: 0; top: 0; width: 30px; height: 30px;
        border-radius: 999px; border: 3px solid #159947; background: rgba(242,183,5,.30);
        box-shadow: 0 0 0 7px rgba(21,153,71,.16); pointer-events: none;
        transform: translate(-80px,-80px); transition: transform .48s cubic-bezier(.2,.8,.2,1);
      }
    `,
  });
  await page.evaluate((caption) => {
    const bubble = document.createElement("div");
    bubble.id = "oshicart-reel-caption";
    bubble.textContent = caption;
    document.body.appendChild(bubble);
    const pointer = document.createElement("div");
    pointer.id = "oshicart-demo-pointer";
    document.body.appendChild(pointer);
    requestAnimationFrame(() => bubble.classList.add("show"));
  }, initialCaption);
}

async function setCaption(page, text) {
  await page.evaluate((value) => {
    const bubble = document.querySelector("#oshicart-reel-caption");
    if (bubble) bubble.textContent = value;
  }, text);
  await page.waitForTimeout(500);
}

async function movePointer(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) return;
  await page.evaluate(({ x, y }) => {
    const pointer = document.querySelector("#oshicart-demo-pointer");
    if (pointer) pointer.style.transform = `translate(${x - 15}px, ${y - 15}px)`;
  }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
  await page.waitForTimeout(550);
}

async function demoFill(page, locator, value) {
  await movePointer(page, locator);
  await locator.click();
  await locator.fill("");
  await locator.pressSequentially(value, { delay: 45 });
  await page.waitForTimeout(250);
}

async function demoClick(page, locator) {
  await movePointer(page, locator);
  await locator.click();
  await page.waitForTimeout(800);
}

async function record(name, authenticated, runner) {
  const context = await browser.newContext({
    viewport: { width: 540, height: 960 },
    deviceScaleFactor: 1,
    colorScheme: "light",
    storageState: authenticated ? AUTH_FILE : undefined,
    recordVideo: { dir: RAW_DIR, size: { width: 540, height: 960 } },
  });
  const page = await context.newPage();
  const video = page.video();
  await runner(page);
  await page.waitForTimeout(800);
  await context.close();
  const generatedPath = await video.path();
  copyFileSync(generatedPath, resolve(OUTPUT_DIR, `${name}.webm`));
  console.log(`Recorded ${name}`);
}

await prepareAuth();

if (START_AT <= 1) await record("01-create-your-store", false, async (page) => {
  await page.goto(`${BASE_URL}/signup`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(900);
  await addReelChrome(page, "Turn your hustle into a real online store");
  await page.waitForTimeout(900);
  await demoFill(page, page.getByLabel(/WhatsApp Number/i), "0810000999");
  await demoFill(page, page.getByLabel(/^Email/i), "hello@yourbakery.example");
  await demoFill(page, page.getByLabel(/^Password/i), "DemoBakery!2026");
  await demoFill(page, page.getByLabel(/Confirm Password/i), "DemoBakery!2026");
  await setCaption(page, "One simple signup • No credit card needed");
  await movePointer(page, page.getByRole("button", { name: /Get Started/i }));
  await page.waitForTimeout(1400);
});

if (START_AT <= 2) await record("02-dashboard-and-store-link", true, async (page) => {
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(1200);
  await addReelChrome(page, "Your business at a glance");
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.scrollTo({ top: 420, behavior: "smooth" }));
  await page.waitForTimeout(1500);
  await setCaption(page, "Products, orders and revenue — organised");
  const viewStore = page.getByRole("link", { name: /view store/i }).first();
  if (await viewStore.isVisible().catch(() => false)) await movePointer(page, viewStore);
  await page.waitForTimeout(1300);
  await setCaption(page, "Share one store link everywhere");
  await page.waitForTimeout(1300);
});

if (START_AT <= 3) await record("03-add-a-product", true, async (page) => {
  await page.goto(`${BASE_URL}/dashboard/products/new`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(1200);
  await addReelChrome(page, "Add a beautiful product in seconds");
  await page.waitForTimeout(900);
  await demoFill(page, page.getByLabel(/Product name/i), "Honey Almond Tart");
  await demoFill(page, page.getByLabel(/Price \(NAD\)/i), "85");
  await demoFill(page, page.getByLabel(/^Description/i), "Buttery almond tart finished with local honey.");
  await setCaption(page, "Add the price, story and a great photo");
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(resolve(ASSET_DIR, "iced-rolls.jpg"));
  await page.waitForTimeout(1700);
  const addButton = page.getByRole("button", { name: /^Add Product$/i });
  if (await addButton.isVisible().catch(() => false)) await movePointer(page, addButton);
  await setCaption(page, "Your catalogue stays clear and professional");
  await page.waitForTimeout(1300);
});

if (START_AT <= 4) await record("04-customer-shopping-flow", false, async (page) => {
  await page.goto(`${BASE_URL}/s/sunrise-crumbs-bakery`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(1400);
  await addReelChrome(page, "A storefront customers will love");
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.scrollTo({ top: 420, behavior: "smooth" }));
  await page.waitForTimeout(1500);
  await setCaption(page, "Browse products, prices and availability");
  const addButton = page.getByRole("button", { name: /add to cart/i }).first();
  if (await addButton.isVisible().catch(() => false)) {
    await demoClick(page, addButton);
    await setCaption(page, "One tap adds it to the cart");
  }
  // The storefront opens its cart drawer immediately after adding an item.
  await page.waitForTimeout(1300);
});

if (START_AT <= 5) await record("05-manage-orders", true, async (page) => {
  await page.goto(`${BASE_URL}/dashboard/orders`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(1400);
  await addReelChrome(page, "Every order in one organised dashboard");
  await page.waitForTimeout(1000);
  const pending = page.getByRole("button", { name: /pending/i }).first();
  if (await pending.isVisible().catch(() => false)) await demoClick(page, pending);
  await setCaption(page, "Filter by status and open any order");
  const orderText = page.getByText(/1001/).first();
  if (await orderText.isVisible().catch(() => false)) await demoClick(page, orderText);
  await page.evaluate(() => window.scrollBy({ top: 280, behavior: "smooth" }));
  await page.waitForTimeout(1200);
  await setCaption(page, "Stay on top of pickup and delivery");
  await page.waitForTimeout(1400);
});

await browser.close();
console.log(`All reels saved to ${OUTPUT_DIR}`);
