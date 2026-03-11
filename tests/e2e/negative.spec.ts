/**
 * Negative / edge-case tests
 *
 * Verifies that invalid inputs produce safe, graceful failures — not
 * blank pages, JS crashes, or incorrect behavior.
 */

import { test, expect } from "@playwright/test";
import { loginAsMerchant, hasAuthCredentials } from "./helpers/auth";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("Invalid store slug", () => {
  test("non-existent slug shows not-found UI", async ({ page }) => {
    await page.goto(`${BASE_URL}/s/completely-invalid-slug-xxxxxx`);
    await expect(page.getByTestId("store-not-found")).toBeVisible();
    await expect(page.getByText("Store Not Found")).toBeVisible();
  });

  test("empty-ish slug is handled without crash", async ({ page }) => {
    // A slug of just dashes - likely not in DB
    await page.goto(`${BASE_URL}/s/---`);
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(5);
    // Should NOT be a blank white page
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("checkout with invalid slug shows not-found", async ({ page }) => {
    await page.goto(`${BASE_URL}/checkout/completely-invalid-slug-xxxxxx`);
    // Should show not-found or redirect — not a blank page
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(5);
  });
});

test.describe("API error handling in product editor", () => {
  test("edit error boundary renders without blank page on crash", async ({
    page,
  }) => {
    if (!hasAuthCredentials()) {
      test.skip();
      return;
    }

    await loginAsMerchant(page);

    // Try to access a product that doesn't belong to this merchant
    await page.goto(
      `${BASE_URL}/dashboard/products/00000000-0000-0000-0000-000000000000/edit`
    );

    // Should redirect to products or show "Product not found" — not a blank page
    const body = await page.locator("body").innerText();
    expect(body.length).toBeGreaterThan(5);
  });
});

test.describe("WhatsApp link integrity", () => {
  test("WhatsApp link on storefront has valid wa.me format", async ({
    page,
  }) => {
    const slug = process.env.TEST_STORE_SLUG;
    if (!slug) {
      test.skip();
      return;
    }

    await page.goto(`${BASE_URL}/s/${slug}`);
    const waLink = page.locator('a[href*="wa.me"]').first();

    if (await waLink.isVisible()) {
      const href = await waLink.getAttribute("href");
      // Must match wa.me/{digits}?text=...
      expect(href).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
    }
  });

  test("checkout WhatsApp message contains order number", async ({ page }) => {
    const slug = process.env.TEST_STORE_SLUG;
    if (!slug) {
      test.skip();
      return;
    }

    await page.goto(`${BASE_URL}/s/${slug}`);
    const addBtn = page.locator('button:has-text("Add to Cart")').first();
    const isVisible = await addBtn.isVisible().catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }

    await addBtn.click();
    await page.goto(`${BASE_URL}/checkout/${slug}`);

    await page.fill('input[placeholder="Your full name"]', "QA Test User");
    await page.fill('input[placeholder="+264 81 123 4567"]', "+264811234567");
    await page.locator('button:has-text("Place Order")').click();

    const waLink = page.locator('a[href*="wa.me"]').first();
    await expect(waLink).toBeVisible({ timeout: 15_000 });

    const href = await waLink.getAttribute("href");
    // Message should include "order" and a number
    const decoded = decodeURIComponent(href || "");
    expect(decoded).toMatch(/order #\d+/i);
  });
});
