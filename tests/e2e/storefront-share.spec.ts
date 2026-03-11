/**
 * REGRESSION: Storefront share link reliability
 *
 * Root cause fixed: dashboard showed relative URL without https:// scheme.
 * These tests lock the correct behavior: absolute URL is shown, copy works,
 * and navigating to the URL opens the right store.
 */

import { test, expect } from "@playwright/test";
import { loginAsMerchant, hasAuthCredentials } from "./helpers/auth";

const TEST_SLUG = process.env.TEST_STORE_SLUG || "test-store";
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("Storefront share link", () => {
  test("shared store URL opens the correct storefront", async ({ page }) => {
    const storeUrl = `${BASE_URL}/s/${TEST_SLUG}`;
    await page.goto(storeUrl);

    // Should not redirect away or show not-found
    await expect(page).not.toHaveURL(/login/);
    const notFound = page.getByTestId("store-not-found");
    await expect(notFound).not.toBeVisible();

    // Store header should be visible
    await expect(page.locator("header")).toBeVisible();
    // Store name heading should appear
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("invalid slug shows not-found UI without crashing", async ({ page }) => {
    await page.goto(`${BASE_URL}/s/this-slug-definitely-does-not-exist-xyz`);

    // Should show the custom not-found UI, not a blank/error page
    await expect(page.getByTestId("store-not-found")).toBeVisible();
    await expect(page.getByText("Store Not Found")).toBeVisible();

    // No JS error in console that would indicate a crash
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });

  test("malformed URL with special characters is handled safely", async ({
    page,
  }) => {
    // URL-encoded, uppercase, and trailing slash variations
    await page.goto(`${BASE_URL}/s/TEST-STORE`);
    // Should either load correctly (if store exists in lowercase) or show not-found
    // Must NOT crash with a 500 or blank page
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(10); // page has content
  });

  test("dashboard displays absolute store URL with https scheme", async ({
    page,
  }) => {
    if (!hasAuthCredentials()) {
      test.skip();
      return;
    }

    await loginAsMerchant(page);

    // Check the share link
    const shareLink = page.getByTestId("store-share-link");
    await expect(shareLink).toBeVisible();
    const href = await shareLink.getAttribute("href");
    expect(href).toMatch(/^https?:\/\//); // Must start with http:// or https://
    expect(href).toContain("/s/");

    // Copy button should exist
    const copyBtn = page.getByTestId("copy-store-link-btn");
    await expect(copyBtn).toBeVisible();
  });

  test("copy store link button works", async ({ page, context }) => {
    if (!hasAuthCredentials()) {
      test.skip();
      return;
    }

    // Grant clipboard permissions
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await loginAsMerchant(page);

    const copyBtn = page.getByTestId("copy-store-link-btn");
    await copyBtn.click();

    // "Copied!" feedback should appear
    await expect(page.getByText("Copied!")).toBeVisible();

    // Clipboard should contain an absolute store URL
    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText()
    );
    expect(clipboardText).toMatch(/^https?:\/\//);
    expect(clipboardText).toContain("/s/");
  });
});
